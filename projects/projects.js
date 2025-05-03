import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedIndex = -1;

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

function getFilteredProjects() {
  return projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

function getYearFilteredProjects(filteredProjects, arcData) {
  if (selectedIndex === -1) {
    return filteredProjects;
  } else {
    const selectedYear = arcData[selectedIndex].data.label;
    return filteredProjects.filter(project => project.year === selectedYear);
  }
}

renderProjects(projects, projectsContainer, 'h2');

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  
  let filteredProjects = getFilteredProjects();
  
  updatePieChart(filteredProjects);
});

function updatePieChart(currentFilteredProjects) {
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  
  let rolledData = d3.rollups(
    currentFilteredProjects,
    (v) => v.length, 
    (d) => d.year, 
  );
  
  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));
  
  let svg = d3.select('#projects-plot');
  svg.selectAll('path').remove();
  
  arcs.forEach((arc, i) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', () => selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        
        svg
          .selectAll('path')
          .attr('class', (_, idx) => (
            selectedIndex === idx ? 'selected' : ''
          ));
        
        let legend = d3.select('.legend');
        legend
          .selectAll('li')
          .attr('class', (_, idx) => (
            selectedIndex === idx ? 'selected legend-item' : 'legend-item'
          ));
        
        // Extra credit fix
        const currentSearchFilteredProjects = getFilteredProjects();
        const yearFilteredProjects = getYearFilteredProjects(currentSearchFilteredProjects, arcData);
        renderProjects(yearFilteredProjects, projectsContainer, 'h2');
      });
  });
  
  let legend = d3.select('.legend');
  legend.selectAll('li').remove(); 
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', selectedIndex === idx ? 'selected legend-item' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
  
  const yearFilteredProjects = getYearFilteredProjects(currentFilteredProjects, arcData);
  renderProjects(yearFilteredProjects, projectsContainer, 'h2');
}

updatePieChart(projects);