var base_url = `https://bsd.test.instructure.com`
var course_id = '111511'


// get rubrics for outcomes...
async function getOutcomeRubrics(course_id) {
    url =`${base_url}/api/v1/courses/${course_id}/rubrics?per_page=100&page=1`
    var obj = await fetch(url)
    var rubrics = {}
    var data = JSON.parse(await obj.text())
    console.log('data', data)
    data.forEach((r, index) => {
        r.data.forEach((rubric) => {
            // rubrics[rubric.learning_outcome_id] = {
            rubrics['_'+rubric.learning_outcome_id] = {
                'long_description': rubric.long_description,
                'description': rubric.description
            }
        })
    })
    console.log(`${Object.keys(rubrics).length} rubrics found!`)
    console.log(rubrics)
    return rubrics
}


// TODO: 
// outcomes needs an assignments place-holder...
/*

outcome_assignment = {
    'course_id': course_id,
    'assign_id': 'outcome_results',
    'assign_name': ' ✔ Outcome Results from Learning Mastery ✔',
    //'due_at': //not sure waht goes here
    'rubric': rubrics, // {} // this is essential for assignment inclusion
    'use_rubric_for_grading': true,
}

// This object is manually created and added to assignments? Maybe if outcome scores are available??

// If chosen, then outcome_rollups serve as submissions (one per student)
// And these submissions have rubrics but will need to be separately pulled... with getOutcomeRubrics...
// Confusion is how to include these without breaking what's already there.

*/

async function getOutcomes(course_id) {
    var outcomes_url = `${base_url}/api/v1/courses/${course_id}/outcome_rollups`
    var outcomes = []
    var results = 1
    let url = `${outcomes_url}`
    console.log(`Fetching ${url}`)
    var obj = await fetch(url)
    var data = JSON.parse(await obj.text())
    data.rollups.forEach((o) => {
        try {
            if (o.scores.length > 0) {
    
                let rubrics = {
                }
    
                o.scores.forEach((s) => {
                    rubrics['_'+s.links.outcome] = {
                        'points': s.score
                    }
                })
    
                let outcome = {
                    'canvas_id': o.links.user,
                    'course_id': course_id,
                    'assign_id': 'outcomes',
                    'assign_name': ' ✔ Outcome Results from Learning Mastery ✔',
                    'status': o.links.status,
                    'section':o.links.section,
                    'rubric_assessment': rubrics,
                    'scores': o.scores
                }
    
                if (outcome.status == 'active') {
                    outcomes.push(outcome)
                }
            }
        } catch(e) {
            console.log('Failed to add score with error: ',e)
        }
    })
    
    results = data.rollups.length
    console.log(`results of length: ${results}`)
    return outcomes
}


var students = []
results = 1

url = `${base_url}/api/v1/courses/${course_id}/students`
console.log(`Fetching ${url}`)
var obj = await fetch(url)
var data2 = JSON.parse(await obj.text())
data2.forEach((s) => {
    try {
        if (s.sis_user_id.length == 6) {
            students.push(s)
        }
    } catch (e) {
        console.log('skipping id with error: ',e)
    }
})
// students.push(data2)
results = data2.length

function getOutcomesByStudentId(outcomes, student_id) {
    let my_outcomes = []
    outcomes.forEach((o, index) => {
        if (o.user == student_id) {
            console.log(`Outcome ${index} matches id: ${student_id} == ${o.user}... adding to my_outcomes`)
            my_outcomes.push(o)
        }
    })
    return my_outcomes
}

function getStudentByStudentId(students, student_id) {
    my_student = {}
    students.forEach((s, index) => {
        // console.log('Checking student',index,'id: ',s.id)
        if (s.id == student_id) {
            my_student = s
        }
    })
    return my_student
}

async function getAssignments(course_id) {
    let page_n = 50;
    let page = 1;
    let data_length = page_n;
    assignments = [];
    // showLoader(true)
    while (data_length == page_n) {
        let url = `${base_url}/api/v1/courses/${course_id}/assignments?order_by=due_at&page=${page}&per_page=${page_n}`
        console.log(`fetch assignments with: ${url}`)
        let res = await fetch(url);
        let data = await JSON.parse(await res.text());
        // console.log(`data length: ${data.length}`)
        data_length = data.length;
        if (data_length > 0) {
            
            // console.log(data);
            data.forEach((e) => {
                
                 let assignment = {
                    'id': e.id,
                    'course_id': course_id,
                    'name': e.name,
                    'use_rubric_for_grading': e.use_rubric_for_grading,
                    'points_possible': e.points_possible,
                    'rubric': e.rubric,
                    'due_at': e.due_at 
                }
                
                // only include assignments that have defined rubrics.
                if (assignment.use_rubric_for_grading | assignment.rubric != undefined) {
                    assignments.push(assignment)
                } else {
                    console.log(`Skipping ${assignment.name} because it does not use a rubric.`)
                }
            })
        } else {
            console.log(`Page ${page_n} contained no data.`)
        }
        page++;
    }

    assignments = assignments.reverse() // most recent first.
    console.log(`Assignments found: ${assignments.length}`)
    // showLoader(false)
    return(assignments)  
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

async function getSubmissions(course_id, assignments, assign_id) {
    // showLoader(true)
    console.log(`Fetching scores w/ course (${course_id}), assign (${assign_id})`)
    let students = await getStudents(course_id)
    let page_n = 50
    let page = 1
    let data_length = page_n
    let submissions = []
    let assignment = getAssignmentById(assignments, assign_id)
    
    while (data_length == page_n) {
        let url = `${base_url}/api/v1/courses/${course_id}/assignments/${assign_id}/submissions?include[]=rubric_assessment&page=${page}&per_page=${page_n}`
        // console.log(`Fetching ${url}`)
        let res = await fetch(url)
        let text = await res.text()
        let data = await JSON.parse(text)
        // console.log(data)
        data_length = data.length
        data.forEach((s) => {
            let submission = {}
            // console.log(`s: ${JSON.stringify(s)}`)
            // console.log(`s.ra: ${JSON.stringify(s.rubric_assessment)}`)

            // s is a score... s.rubric_assessment: object {_id, }
            try {
                if ('rubric_assessment' in s) {
                   submission = {
                        'course_id': course_id,
                        'canvas_id': s.user_id,
                        'assign_id': s.assignment_id,
                        'assign_name': assignment.name,
                        'rubric_assessment': s.rubric_assessment,
                        'excused': s.excused,
                        'late' : s.late,
                        'missing': s.missing,
                        'grading_per': s.grading_period_id,
                   }
                } else {
                   submission = {
                        'course_id': course_id,
                        'canvas_id': s.user_id,
                        'synergy_id': s.synergy_id,
                        'assign_id': s.assignment_id,
                        'assign_name': assignment.name,
                        'score': '',
                        'excused': s.excused,
                        'late' : s.late,
                        'missing': s.missing,
                        'grading_per': s.grading_period_id,
                   }
                }
            } catch (e) {
                console.log(`Error on score: ${JSON.stringify(s)}\nWith error: ${e}`)
            }
            if (Object.keys(submission).length > 0) {
                submissions.push(submission)
            }
        });
        page++;
        
    }
    console.log(`Submissions found: ${submissions.length}`)
    // submissions = add_synergy_id(submissions, students)
    // // send submissions to background.
    // send_to_background(submissions, 'submissions')
    // update_submissions_overview(submissions)
    // showLoader(false)
    return(submissions)
}

async function getStudents(course_id) {
    let res = await fetch(`${base_url}/courses/${course_id}/students`)
    let data = await JSON.parse(await res.text())
    let students = []
    // console.log(data[5]);
    data.forEach((e) => {
        // console.log(e.id, e.login_id, e.sortable_name, e.short_name)
        let student = {
            'canvas_id': e.id,
            'synergy_id': e.login_id
        }
        students.push(student)
    })
    console.log(`Students found: ${students.length}`)
    // console.log(students[3])
    return(students)
}

var outcomes = await getOutcomes(course_id)
var outcome_rubrics = await getOutcomeRubrics(course_id)

my_id = '116401'
getStudentByStudentId(students, my_id)
getOutcomesByStudentId(outcomes, my_id)

my_id = '106249'
getStudentByStudentId(students, my_id)
getOutcomesByStudentId(outcomes, my_id)

var assignments = await getAssignments(course_id)
// outcomes are having repetition

submissions = await getSubmissions(course_id, assignments, assignments[2].id)