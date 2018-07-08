const course_code_element = document.getElementById('course_code');
const crn_element = document.getElementById('crn');
const btn_submit_element = document.getElementById('btn_submit');
const err_msg1_element = document.getElementById('err_msg1');
const err_msg2_element = document.getElementById('err_msg2');
const course_ul_element = document.getElementById('course_ul');
const clear_storage_btn_element = document.getElementById('clear_storage');

function displayCourseList(courses) {
  removeChild(course_ul_element);
  courses.map((item) => {
    course_li = document.createElement('li');
    course_li.innerHTML = `${item[0]}(${item[1]}): ${item[2]}`;
    course_ul_element.appendChild(course_li);
  });
}

function removeChild(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function requestCourseInfoUrl(subjectCode, courseNumber, crn, year='2018', semester='fall') {
  /*  usage example:
      requestCourseInfoUrl('CS', '374', '66445', '2018', 'fall') => the request url to be fetched  */
  return `https://courses.illinois.edu/cisapp/explorer/schedule/${year}/${semester}/${subjectCode}/${courseNumber}/${crn}.xml?mode=detail`
}

function splitCourseCode(courseCode) {
  let subjectCodeMatch = courseCode.match(/\D/g);
  let courseNumberMatch = courseCode.match(/\d/g);
  return [subjectCodeMatch ? subjectCodeMatch.join('').toUpperCase() : "" , courseNumberMatch ? courseNumberMatch.join('') : ""];
}


chrome.storage.sync.get(['course_list'], (result) => {
  if (result.course_list) {
    displayCourseList(result.course_list);
  }
});

btn_submit_element.addEventListener("click", (event) => {
  event.preventDefault();
  const courseCode = course_code_element.value;
  const crn = crn_element.value;
  course_code_element.value = "";
  crn_element.value = "";
  if (crn == "" || courseCode == "") {
    err_msg1_element.style.display = "block";
    return;
  } else {
    err_msg1_element.style.display = "none";
    let [subjectCode, courseNumber] = splitCourseCode(courseCode);
    let request_url = requestCourseInfoUrl(subjectCode, courseNumber, crn);

    fetch(request_url)
      .then(response => response.text())
      .then(str => {
        if (str.slice(0, 4) == 'null') {
          return Promise.reject(new Error('The given course code can not be found.'));
        }
        return (new DOMParser().parseFromString(str, "text/xml"))
      })
      .then(data => {
        err_msg2_element.style.display = "none";
        let enrollmentStatus = data.getElementsByTagName('enrollmentStatus')[0].innerHTML;

        chrome.storage.sync.get(['course_list'], (result) => {
          let new_course_list = null;
          if (!result.course_list) {
            new_course_list = [[courseCode, crn, enrollmentStatus]]
            chrome.storage.sync.set({course_list: new_course_list}, () => {
              displayCourseList(new_course_list);
            });
          } else {
            new_course_list = result.course_list.concat([[courseCode, crn, enrollmentStatus]]);
            chrome.storage.sync.set({course_list: new_course_list}, () => {
              displayCourseList(new_course_list);
            });
          }
        });
      })
      .catch(err => {
        console.log("Something went wrong...", err);
        err_msg2_element.style.display = "block";
      });
  }
});

clear_storage_btn_element.addEventListener('click', (event) => {
  err_msg1_element.style.display = "none";
  err_msg2_element.style.display = "none";
  course_code_element.value = "";
  crn_element.value = "";

  chrome.storage.sync.clear(removeChild(course_ul_element));
});