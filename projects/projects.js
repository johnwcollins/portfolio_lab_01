
import { fetchJSON, renderProjects } from '../global.js';





// 1. Import D3 (add this at the top of your projects.js file)
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Your existing code for projects.js would be here...
const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

// 2. Create an arc generator function
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// 3. Generate a full circle arc (from 0 to 2π radians)
let arc = arcGenerator({
  startAngle: 0,
  endAngle: 2 * Math.PI,
});

// 4. Add the path to your SVG element
d3.select('#projects-plot').append('path').attr('d', arc).attr('fill', 'red');