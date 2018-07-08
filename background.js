const updateInterval = 1; // in minutes

function splitCourseCode(courseCode) {
  let subjectCodeMatch = courseCode.match(/\D/g);
  let courseNumberMatch = courseCode.match(/\d/g)
  return [subjectCodeMatch ? subjectCodeMatch.join('').toUpperCase() : "" , courseNumberMatch ? courseNumberMatch.join('') : ""];
}

function requestCourseInfoUrl(subjectCode, courseNumber, crn, year='2018', semester='fall') {
  /*  usage example:
      requestCourseInfoUrl('CS', '374', '66445', '2018', 'fall') => the request url to be fetched  */
  return `https://courses.illinois.edu/cisapp/explorer/schedule/${year}/${semester}/${subjectCode}/${courseNumber}/${crn}.xml?mode=detail`
}

let timerId = setInterval(() => {
  chrome.storage.sync.get(['course_list'], (result) => {
    if (result.course_list) {
      result.course_list.forEach((item, idx) => {
        let courseCode = item[0];
        let crn = item[1];
        let prevEnrollmentStatus = item[2];
        let [subjectCode, courseNumber] = splitCourseCode(courseCode);
        let request_url = requestCourseInfoUrl(subjectCode, courseNumber, crn);
        fetch(request_url)
          .then(response => response.text())
          .then(str => (new DOMParser().parseFromString(str, "text/xml")))
          .then(data => {
            let enrollmentStatus = data.getElementsByTagName('enrollmentStatus')[0].innerHTML;
            let new_course_list = [...result.course_list.slice(0, idx), [courseCode, crn, enrollmentStatus], ...result.course_list.slice(idx+1)];
            chrome.storage.sync.set({
              course_list: new_course_list
            });
            if (prevEnrollmentStatus == 'Closed' && enrollmentStatus != 'Closed') {
              // notification
              chrome.notifications.clear('course open');
              chrome.notifications.create('course open', {
                type: 'basic',
                title: 'A seat has become available',
                message: `${courseCode}(${crn}) has a new seat open!`,
                iconUrl: 'images/get_started128.png'
              });
            }
          })
      })
    }
  })
}, 1000 * 60 * updateInterval);