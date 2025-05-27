// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';



import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


/* ---------- globals --------- */
let xScale, yScale, commits, filteredCommits, data;
let commitProgress = 100;
let timeScale;

let NUM_ITEMS = 100;
let ITEM_HEIGHT = 30;
let VISIBLE_COUNT = 12;

/* ---------- data loading --------- */
async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line:     +row.line,
    depth:    +row.depth,
    length:   +row.length,
    datetime: new Date(row.datetime),
    date:     new Date(row.date + 'T00:00' + row.timezone),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const f = lines[0];
    const obj = {
      id,
      url: `https://github.com/johnwcollins/portfolio_lab_01/commit/${id}`,
      author: f.author,
      datetime: f.datetime,
      hourFrac: f.datetime.getHours() + f.datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(obj, 'lines', { value: lines, enumerable: false });
    return obj;
  });
}

/* ---------- basic stats block --------- */
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');

  dl.append('dt').text('Total LOC');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Number of files');
  dl.append('dd').text(d3.group(data, d => d.file).size);

  const fileLens = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  dl.append('dt').text('Longest file (lines)');
  dl.append('dd').text(d3.max(fileLens, d => d[1]));
}

/* ---------- file stats block --------- */
function renderFileStats() {
  const lines = filteredCommits.flatMap(d => d.lines);
  let files = d3.groups(lines, d => d.file).map(([name, lines]) => ({ name, lines }));

  files = d3.sort(files, d => -d.lines.length);
  const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  const container = d3.select('.files');
  container.selectAll('div').remove();

  const filesContainer = container.selectAll('div')
    .data(files)
    .enter()
    .append('div');

  filesContainer.append('dt')
    .style('grid-column', '1')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  const dd = filesContainer.append('dd').style('grid-column', '2');
  dd.selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}

/* ---------- tooltip helpers --------- */
function renderTooltipContent(c) {
  if (!c) return;
  commit_link.href       = c.url;
  commit_link.textContent = c.id;
  commit_date.textContent = c.datetime.toLocaleDateString('en',{dateStyle:'full'});
  commit_time.textContent = c.datetime.toLocaleTimeString('en',{timeStyle:'short'});
  commit_author.textContent = c.author;
  commit_lines.textContent  = c.totalLines;
}
function showTip(show) { commit_tooltip.hidden = !show; }
function moveTip(e)    {
  commit_tooltip.style.left = e.clientX+10+'px';
  commit_tooltip.style.top  = e.clientY+10+'px';
}

/* ---------- brush-related helpers --------- */
function isCommitSelected(sel, d) {
  if (!sel) return false;
  const [[x0,y0],[x1,y1]] = sel;
  const x = xScale(d.datetime);
  const y = yScale(d.hourFrac);
  return x0<=x && x<=x1 && y0<=y && y<=y1;
}
function renderSelectionCount(sel){
  const selCommits = sel ? filteredCommits.filter(d=>isCommitSelected(sel,d)) : [];
  selection_count.textContent = `${selCommits.length || 'No'} commits selected`;
  return selCommits;
}
function renderLanguageBreakdown(sel){
  const list = language_breakdown;
  list.innerHTML = '';
  const selCommits = sel ? filteredCommits.filter(d=>isCommitSelected(sel,d)) : [];
  if(!selCommits.length) return;

  const lines = selCommits.flatMap(d=>d.lines);
  const br = d3.rollup(lines,v=>v.length,d=>d.type);
  for(const [lang,c] of br){
    const pct = d3.format('.1~%')(c/lines.length);
    list.innerHTML += `<dt>${lang}</dt><dd>${c} lines (${pct})</dd>`;
  }
}

/* ---------- updated scatter plot ---------- */
function updateScatterPlot(data, filteredCommits) {
  d3.select('svg').remove();

  const W=1000,H=600, m={t:10,r:10,b:30,l:40};
  const area={l:m.l, r:W-m.r, t:m.t, b:H-m.b, w:W-m.l-m.r, h:H-m.t-m.b};

  const svg = d3.select('#chart').append('svg')
                .attr('viewBox',`0 0 ${W} ${H}`)
                .style('overflow','visible');

  xScale = d3.scaleTime()
             .domain(d3.extent(filteredCommits, d => d.datetime))
             .range([area.l, area.r]).nice();
  yScale = d3.scaleLinear().domain([0,24]).range([area.b,area.t]);

  svg.append('g').attr('class','gridlines')
     .attr('transform',`translate(${area.l},0)`)
     .call(d3.axisLeft(yScale).tickSize(-area.w).tickFormat(''));

  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2,30]);

  svg.append('g').attr('transform',`translate(0,${area.b})`).call(d3.axisBottom(xScale));
  svg.append('g').attr('transform',`translate(${area.l},0)`)
     .call(d3.axisLeft(yScale).tickFormat(d=>String(d%24).padStart(2,'0')+':00'));

  const dots = svg.append('g').attr('class','dots');
  dots.selectAll('circle').data(filteredCommits).join('circle')
      .attr('cx',d=>xScale(d.datetime))
      .attr('cy',d=>yScale(d.hourFrac))
      .attr('r', d=>rScale(d.totalLines))
      .attr('fill','steelblue')
      .style('fill-opacity',.7)
      .on('mouseenter',(e,d)=>{
        d3.select(e.currentTarget).style('fill-opacity',1);
        renderTooltipContent(d);
        showTip(true);
        moveTip(e);
      })
      .on('mousemove',moveTip)
      .on('mouseleave',e=>{
        d3.select(e.currentTarget).style('fill-opacity',.7);
        showTip(false);
      });

  const brush = d3.brush()
      .extent([[area.l, area.t],[area.r, area.b]])
      .on('start brush end', e => {
        const sel = e.selection;
        d3.selectAll('circle').classed('selected', d => isCommitSelected(sel, d));
        renderSelectionCount(sel);
        renderLanguageBreakdown(sel);
      });

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

/* ---------- time filtering + slider UI ---------- */
function filterCommitsByTime() {
  const commitMaxTime = timeScale.invert(commitProgress);
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

function updateTimeDisplay() {
  const slider = document.getElementById('commitSlider');
  const selectedTime = document.getElementById('selectedTime');

  commitProgress = +slider.value;
  const commitMaxTime = timeScale.invert(commitProgress);
  selectedTime.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  filterCommitsByTime();
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  renderFileStats();
}

function narrativeHTML(commit, index){
  // tiny helper: returns a paragraph of dummy text for one commit
  const filesEdited = d3.rollups(commit.lines, v => v.length, d => d.file).length;
  const when = commit.datetime.toLocaleString("en",
                  {dateStyle:"full", timeStyle:"short"});
  const adjective = index ? "another glorious commit" : "my first commit, and it was glorious";
  return /*html*/`
    <p>
      On ${when}, I made
      <a href="${commit.url}" target="_blank">${adjective}</a>.
      I edited ${commit.totalLines} lines across ${filesEdited} files.
      Then I looked over all I had made, and I saw that it was very good.
    </p>`;
}

/* ---------- scrollytelling ---------- */
function renderItems(startIndex){
  // wipe the previous slice
  itemsContainer.selectAll('div.item').remove();

  // slice the data we want visible
  const end   = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const slice = commits.slice(startIndex, end);

  // redraw everything that depends on the filtered list
  filteredCommits = slice;
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  renderFileStats();

  // ⇣  NEW bits start here  ⇣
  itemsContainer.selectAll('div.item')
    .data(slice, d => d.id)                  // keyed by commit hash
    .enter()
      .append('div')
      .attr('class','item')
      .html((d,i) => narrativeHTML(d, startIndex + i));
  // ⇡  NEW bits end here  ⇡
}


/* ---------- kick everything off ---------- */
const commit_tooltip      = document.getElementById('commit-tooltip');
const commit_link         = document.getElementById('commit-link');
const commit_date         = document.getElementById('commit-date');
const commit_time         = document.getElementById('commit-time');
const commit_author       = document.getElementById('commit-author');
const commit_lines        = document.getElementById('commit-lines');
const selection_count     = document.getElementById('selection-count');
const language_breakdown  = document.getElementById('language-breakdown');

data = await loadData();
commits = processCommits(data);

NUM_ITEMS = commits.length;
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select('#scroll-container');


const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});

timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

filterCommitsByTime();
updateScatterPlot(data, filteredCommits);
renderCommitInfo(data, filteredCommits);
renderFileStats();
renderItems(0);

const slider = document.getElementById('commitSlider');
const selectedTime = document.getElementById('selectedTime');
selectedTime.textContent = timeScale.invert(commitProgress).toLocaleString(undefined, {
  dateStyle: 'long',
  timeStyle: 'short'
});
slider.addEventListener('input', updateTimeDisplay);


// Add this to the bottom of your main.js file

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );


  // Add this to the bottom of main.js

function onStepEnter(response) {
  // Get the commit data from the element
  const commit = response.element.__data__;
  console.log('Entered step for commit:', commit.datetime);
  
  // Filter commits up to this point in time
  filteredCommits = commits.filter(d => d.datetime <= commit.datetime);
  
  // Update the visualizations
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  renderFileStats();
}

// Initialize scrollama
const scroller = scrollama();
scroller
  .setup({
    container: '#scrollytelling',
    step: '#scatter-story .step',
  })
  .onStepEnter(onStepEnter);