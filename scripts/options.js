// Saves options to chrome.storage
function updateExplanation(value) {
    let example = 2 + value
    let example_result = 3
    let example_2 = Math.round((2 + value - 0.01)*100)/100
    $('#explanation').html(`<p>With this value set, a score of <b>${example}</b> will round to <b>${example_result}</b>. And a score of <b>${example_2}</b> will round to <b>2</b>.}`)
}

$(function() {
    $("#rounding").slider({
        value:0.5,
        min: 0.01,
        max: 0.99,
        step: 0.01,
        slide: function(event, ui) {
            $("#amount").val(ui.value )
            updateExplanation(ui.value)
        }
    })
    .css("width","50%")

    $("#amount").val($("#rounding").slider("value"))
})

$('#amount').on('input',() => {
    try {
        let val = parseFloat($('#amount').val())
        if (typeof val == 'number') {
            console.log(`Received input, rounding set to ${val}`)
            $('#rounding').slider('value',val)
            updateExplanation(val)
        }
    } catch(e) {
        console.log('must be a number')
    }
    
})


const saveOptions = () => {
  var rounding = $('#rounding').slider('value');

    console.log(`Save options w/ rounding = ${rounding}`)
  chrome.storage.sync.set(
    { 
        roundUpFrom: rounding
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status')
      status.textContent = 'Options saved.'
      setTimeout(() => {
        status.textContent = ''
      }, 750)
    }
  )
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    keys = {
        roundUpFrom: 0.5 
    },
    (items) => {
        let val = items.roundUpFrom
        console.log(`Setting rounding to ${val}...`)
        $('#rounding').slider('value', val)
        $("#amount").val($("#rounding").slider("value"))
        updateExplanation(val)
    }
  )
}

document.addEventListener('DOMContentLoaded', restoreOptions)
document.getElementById('save').addEventListener('click', saveOptions)