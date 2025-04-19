console.log('ITS ALIVE!');
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
// PART 3 ****
// 3.1
console.log('What?');
let pages = [
  { url: './', title: 'Home' },
  { url: './projects/', title: 'Projects' },
  { url: './cv/', title: 'About' },
  { url: './contact/', title: 'Contact' },
 ];
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/" // Local server
  : "/portfolio_lab_01/"; // GitHub Pages repo name
let nav = document.createElement('nav');
document.body.prepend(nav);
for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  // Apply BASE_PATH inside the loop for each URL
  url = !url.startsWith('http') ? BASE_PATH + url : url;
  
  // CHANGE THIS PART:
  // Instead of using insertAdjacentHTML, create the element in JS
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  
  // Add the 'current' class if this link points to the current page
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }
  
  // Add target="_blank" for external links (if host is different)
  if (a.host !== location.host) {
    a.target = "_blank";
  }
  
  // Add the link to the navigation
  nav.append(a);
}



document.body.insertAdjacentHTML(
  'afterbegin',
  `<label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

// First get a reference to the select element
const select = document.querySelector('.color-scheme select');

// Create a function to set the color scheme to avoid repeating code
function setColorScheme(colorScheme) {
  // Set the color-scheme property on the root element
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  
  // Update the select element to match
  select.value = colorScheme;
  
  // Save to localStorage for persistence
  localStorage.colorScheme = colorScheme;
}

// Check if user has a saved preference when the page loads
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

// Add event listener for when the user changes the selection
select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
});




// Option 1
// if (!url.startsWith('http')) {
//   url = BASE_PATH + url;
// }

// Option 2
// url = !url.startsWith('http') ? BASE_PATH + url : url;






// PART 2
// const navLinks = $$("nav a");
// console.log(navLinks);


// // Find the link the current page
// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname,
//   );

// console.log(currentLink); // Logs the <a> element that links to the current page, or undefined if none is found
// console.log('Testing!');

// // Option 1
// if (currentLink) {
//     currentLink.classList.add('current');
//   }
  
//   // OR Option 2 (just one of these!)
//   //currentLink?.classList.add('current');