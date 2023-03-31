# bsd-copy-paste
Chrome extension to provide copy>paste for BSD teachers from canvas to synergy. See [This youtube demo](https://youtu.be/ZI-WODo4dOI)

This extension uses the Canvas API to fetch assignments, submissions and students from canvas. The extension uses the student data to match student's canvas user_id with their synergy student_id and update all submissions results to include their synergy_id. Submissions results consist of the set of available outcome scores for each student on a given assignment.

Once Canvas data is fetched it is updated and sent to service_worker (background.js) which requests the creation of a contextMenu available when the user clicks into a cell in Synergy gradebook. The context menu allows the user to choose the Academic Learning Target (ALT) from which to enter scores. The 'paste' function ensures a match between the synergy_id's. Unmatched scores on either side will have no effect on the paste.

# Active Development

1. Focus on making extension more responsive and fixing issues that result from periods of inactivity (causes service_worker to go unresponsive)
2. Make design changes that improve consistency across app
3. Changes to support docs
4. Testing app in real gradebook environments