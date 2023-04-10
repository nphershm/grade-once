// TODO
// update contextMenu persistence...



// function get_rubric_id_from_scores(scores) {
//     // assuming multiple scores
//     return scores[0].rubric_id
// }

function getAssignmentIdFromSubmissions(submissions) {
    return submissions[0].assign_id
}

function getAssignmentById(assignments, assign_id) {
    if (Object.keys(assignments).length == 0) {
        console.log('No assignments')
        return null
    }
    let my_assign = null
    assignments.forEach((a) => {
        if (a.id == assign_id) {
            my_assign = a
        }  
    })
    if (my_assign == null) {
        console.log(`Assignment ${assign_id} not found in ${assignments.length}`)
    }
    
    return my_assign
}

function getAssignmentIdFromSubmissions(scores) {
    return scores[0].assign_id
}

const getRubrics = (assignment) => {
    let rubrics = []
    assignment.rubric.forEach((r) => {
        // console.log(`rubric: ${JSON.stringify(r)}`)
        // console.log(`ALT code: ${r.description}\nALT Desc: ${r.long_description}`)
        let rubric = {
            id: r.id,
            alt_code: r.description,
            alt_text: r.long_description,
        }
        rubrics.push(rubric)
    })
    return(rubrics)
}

const getRubric = (assignment, rubric_id) => {
    rubric = {}
    getRubrics(assignment).forEach((r) =>{
        if (r.id == rubric_id) {
            rubric = r
        }  
    })
    return(rubric)
}

function getScoresFromSubmissionsByRubricId(submissions, rubric_id) {
    // submissions objects.keys = {assign_id, canvas_id, excused, grading_per, late, rubric_assessment{}, synergy_id}
    if (Object.keys(submissions).length == 0) {
        console.log(`No submissions`)
        return null
    }
    let scores = []
    submissions.forEach((s) => {
        let score = {}
        try {
            if ('rubric_assessment' in s) {
                Object.keys(s.rubric_assessment).forEach((r) => {
                    if (r == rubric_id) {
                        score = {
                            'canvas_id': s.canvas_id,
                            'synergy_id': s.synergy_id,
                            'assign_id': s.assign_id,
                            'rubric_id' : rubric_id,
                            'score': s.rubric_assessment[r].points,
                            'excused': s.excused,
                            'late' : s.late,
                            'missing':s.missing,
                            'grading_per': s.grading_per,
                        }
                    }
                })
            }
        } catch (e) {
            console.log(`Error on score extract ${e}`)
            console.log(s)
        }
        if (Object.keys(score).length > 0) {
            scores.push(score)
        }
    })

    return scores
}

// needs to convert 1, 2, 3 and 1.33, 2.66/7 (?), 4 scores
const use_cgr = (scores) => {
    console.log(`Converting scores to CI, G, R behavior scores.`)
    scores.forEach((s) =>{
        if (s.score == '') {
            // pass
        } else if (s.score < 1.5) {
            s.score = 'R'
        } else if (s.score < 2.75) {
            s.score = 'G'
        } else if (s.score >= 3) {
            s.score = 'CI'
        }
    })
    return(scores)
}

async function bg_get_submissions() {
    let submissions = []
    await chrome.storage.local.get(['submissions']).then((response) => {
        submissions = response.submissions
        console.log(`found ${submissions.length} submissions in local storage`)
    })

    let assign_id = getAssignmentIdFromSubmissions(submissions)
    console.log(`returning ${submissions.length} submissions for assign ${assign_id} from background.`)
    return(submissions)
}

async function bg_get_assignments() {
    let assignments = []
    await chrome.storage.local.get(['assignments']).then((response) => {
        assignments = response.assignments
        console.log(`Found ${assignments.length} assignments in local storage`)
    })
    console.log(`returning ${assignments.length} assignments from background`);
    return(assignments);
}

async function bg_clear_all() {
    await chrome.storage.local.clear()
    await chrome.contextMenus.removeAll()
}

function bg_syn_update(score, synergy_id, row_index, col_index) {
    // console.log(`bg_syn_update called with ${score}, ${synergy_id}, ${row_index}, ${col_index}`);
    // console.log('Line 2...');
    // console.log(`window.frames ${window.top.frames[0]}`)

    // something wonky happening in the window call here (this is called by chrome.scripting when injected... what is the prob??)
    // console.log(`Window.frames[0]...jQuery...: ${$(window.frames[0])[0].jQuery('div')}`) // still failing at window call.

    // TODO this call fails... 
    let table = $(window.frames[0])[0].jQuery('.dx-datagrid-rowsview table');

    // console.log(`bg_syn: table: ${table}`)

    let my_row = table
    .find('span.student-perm-id:contains("'+synergy_id+'")')
    .closest('tr').attr('aria-rowindex');

    if (my_row != row_index) {
        throw new Error(`Received ${synergy_id}, row ${row_index} but should be row: ${my_row}`)
    } else {
        // console.log(`Writing score!`);
    }

    table
    .find('tr[aria-rowindex="'+row_index+'"]')
    .find('td[aria-colindex="'+col_index+'"]')
    .find('div.asgn-cell-wrap')
    .click()
    .find('input')
    .val(score)
    .trigger('change')
}

async function call_syn_paste(tabId, submissions, rubric_id, convert_scores_to_cgr) {
    console.log(`call_syn_paste received: tabId, submissions, rubric_id, convert_scores_to_cgr:`, tabId, submissions, rubric_id, convert_scores_to_cgr)

    let scores = getScoresFromSubmissionsByRubricId(submissions, rubric_id)
    if (convert_scores_to_cgr) {
        scores = use_cgr(scores)
    }

    let my_message = {
        from: 'background.js',
        to: 'synergy.js',
        title: 'synergy_paste',
        body: 'Please paste values now',
        attachment: scores
    }; 

    // console.log('scores: ',scores)
    // console.log('tabId: ',tabId)
    // console.log('my_message: ',my_message)


    //Error:  Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
    // console.log(`call_syn_paste w/ tabId, scores`)
    // console.log(tabId)
    // TODO solve: response is undefined.... not getting response back.
    // Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.

    chrome.tabs.sendMessage(tabId, my_message, (response) => {
        console.log(`bg asked tab ${tabId} for paste with ${scores.length} scores and heard: ${response}`)
    })
}

function contextListener(info, tab) {
    // console.log('bg received click event...');
    bg_get_assignments().then((assignments)=> {
        bg_get_submissions().then((submissions) => {
            let assign_id = getAssignmentIdFromSubmissions(submissions)
            let assignment = getAssignmentById(assignments, assign_id)
            if (info.menuItemId == 'assignment') {
                //pass 
            } else {
                // console.log('context click w/ info, tab}', info, tab)
                
                // console.log(`paste requested on url: ${sender.tab.url}`);
                rubric_id = info.menuItemId
                
                // console.log(`rubric_id: ${rubric_id}`)
                // console.log('Info: ',info)
                // let rubric = getRubric(assignment, rubric_id)
                // console.log(`User requested paste scores for ${rubric.alt_code} - ${assignment.name}`)
                // console.log(`call_syn_paste with ${tab.id} and ${rubric_id}`)

                let rubric_text = getRubric(assignment, rubric_id).alt_code
                // console.log(rubric_text)
                let convert_scores_to_cgr = false
                if  (rubric_text.includes('BLT')) {
                    convert_scores_to_cgr = true
                }
                call_syn_paste(tab.id, submissions, rubric_id, convert_scores_to_cgr)
            }
        })
    })
}

function setupContextMenu(assignments, submissions) {
    console.log(`Setting up contextMenu with assignments, submissions:`)
    console.log(assignments, submissions)
    let assign_id = getAssignmentIdFromSubmissions(submissions)
    // console.log(`getAssignment id: ${assign_id}`)

    // fetches assignments from global var...
    // convert to storage request...
    let assignment = getAssignmentById(assignments, assign_id)
    let rubrics = getRubrics(assignment)

    // update contextMenu
    chrome.contextMenus.removeAll()
    chrome.contextMenus.create(
        createProperties = {
            id: 'assignment', 
            title: assignment.name,
            contexts: ["editable"],
            type: 'normal',
            documentUrlPatterns: ["https://synergy.beaverton.k12.or.us/*","https://syntrn.beaverton.k12.or.us/*"]
        });

    rubrics.forEach((r, index) => {
        chrome.contextMenus.create(
        createProperties = {
            id: r.id, 
            parentId: 'assignment',
            title: `${r.alt_code} - ${r.alt_text.slice(0,35)}`,
            contexts: ["editable"],
            type: 'normal',
            documentUrlPatterns: ["https://synergy.beaverton.k12.or.us/*","https://syntrn.beaverton.k12.or.us/*"]
        });
    })
    addContextListener()
}

function addContextListener() {
    if (!chrome.contextMenus.onClicked.hasListener(contextListener)) {
        console.log('No contextMenu listener, adding contextListener!')
        chrome.contextMenus.onClicked.addListener(contextListener)    
    } else {
        console.log('Already have contextListener for contextMenu, no additional listener being added')
    }
}

function mainListener(request, sender, sendResponse) {
    if (request.from == 'popup.js' & request.to == "background.js" & request.title == "sending_assignments") {
        console.log('Background received a message from popup.js: ' + request.body);
        
        let assignments = request.attachment;
        chrome.storage.local.set({
            'assignments': assignments
        }, () => {
            console.log(`${assignments.length} assignments written to local storage`)
        })
        sendResponse('Thanks for sending! Assignments updated in background')
    }

    if (request.from == 'popup.js' & request.to == "background.js" & request.title == "sending_submissions") {
        console.log('Background received a message from popup.js: ' + request.body);

        let submissions = request.attachment;
        chrome.storage.local.set({
            'submissions': submissions
        },() => {
            console.log(`${submissions.length} submissions sent to local storage`)
        })

        // fetch assignments from local.storage

        chrome.storage.local.get(['assignments','submissions']).then((result) => {
            let assignments = result.assignments
            // we have submissions from the listener and assignments from storage...
            // let's make the menu!
            setupContextMenu(assignments, submissions)
        })

        // if submissions exist, then there should be assignments
        sendResponse('Thanks for sending! Submissions updated in background');
    }

    if (request.from == 'popup.js' & request.to == "background.js" & request.title == "checking_for_assignments") {
        console.log('Background received a message from popup.js: ' + request.body);
        bg_get_assignments()
        .then((assignments) => {
            console.log('bg_get_assignments returned assignments:')
            console.log(assignments)
            if (assignments == null) {
                sendResponse(false);
            } else {
                sendResponse(assignments);
            }
        })
        return true
    }

    if (request.from == 'popup.js' & request.to == "background.js" & request.title == "checking_for_submissions") {
        console.log('Background received a message from popup.js: ' + request.body)
        bg_get_submissions()
        .then((submissions) => {
            if (submissions == null) {
                sendResponse(false)
            } else {
                bg_get_assignments().then((assignments) => {
                    setupContextMenu(assignments, submissions)
                })
                sendResponse(submissions)
            }
        })
        return true
    }

    if (request.from == 'popup.js' & request.to == "background.js" & request.title == "clear_data") {
        console.log('Background received a message from popup.js: ' + request.body)
        
        bg_clear_all().then(() => {
            sendResponse('Background cleared storage data and removed contextMenus!')
        })
        
        return true
    }

    if (request.from == 'synergy.js' & request.to == 'background.js' & request.title == 'inject') {
        // Process script inject...
        // console.log(`Received inject request: ${request.injectScript}`);
        console.log(`Request contains: ${JSON.stringify(request)}`)
        console.log(`Sending tab: ${sender.tab.id}`)
        chrome.scripting.executeScript({
            world: 'MAIN',
            args: [request.score, request.synergy_id, request.row, request.col], // score, sis_number, row_index, col_index
            target: {tabId: sender.tab.id},
            func: bg_syn_update
        }).then(injectionResults => {
            for (const frameResult of injectionResults) {
              const {frameId, result} = frameResult;
            //   console.log(`Frame ${frameId} result:`, result);
            }
        });
        sendResponse('Injection completed');
    }
}
// listening for events from popup...
if (!chrome.runtime.onMessage.hasListener(mainListener)) {
    console.log('No runtime listener found, adding ::mainListener:: to runtime.onMessage...')
    chrome.runtime.onMessage.addListener(mainListener)
} else {
    console.log('Already have mainListener, not adding additional')
}

addContextListener()

// chrome.runtime.onSuspend.addListener(() => {
//     console.log('Background knows that unload is coming soon... time to disable contextMenus?')
//     chrome.ContextMenus.removeAll()
// })