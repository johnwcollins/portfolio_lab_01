import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- globals --------- */
let xScale, yScale, commits;

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
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

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
function moveTip(e)    { commit_tooltip.style.left = e.clientX+10+'px';
                          commit_tooltip.style.top  = e.clientY+10+'px'; }

/* ---------- brush-related helpers --------- */
function isCommitSelected(sel, d) {
  if (!sel) return false;
  const [[x0,y0],[x1,y1]] = sel;
  const x = xScale(d.datetime);
  const y = yScale(d.hourFrac);
  return x0<=x && x<=x1 && y0<=y && y<=y1;
}
function renderSelectionCount(sel){
  const selCommits = sel ? commits.filter(d=>isCommitSelected(sel,d)) : [];
  selection_count.textContent = `${selCommits.length||'No'} commits selected`;
  return selCommits;
}
function renderLanguageBreakdown(sel){
  const list = language_breakdown;
  list.innerHTML = '';
  const selCommits = sel ? commits.filter(d=>isCommitSelected(sel,d)) : [];
  if(!selCommits.length) return;

  const lines = selCommits.flatMap(d=>d.lines);
  const br = d3.rollup(lines,v=>v.length,d=>d.type);
  for(const [lang,c] of br){
    const pct = d3.format('.1~%')(c/lines.length);
    list.innerHTML += `<dt>${lang}</dt><dd>${c} lines (${pct})</dd>`;
  }
}

/* ---------- main scatter / brush render ---------- */
function renderScatterPlot(commitsIn) {
  commits = commitsIn;
  const W=1000,H=600, m={t:10,r:10,b:30,l:40};
  const area={l:m.l, r:W-m.r, t:m.t, b:H-m.b, w:W-m.l-m.r, h:H-m.t-m.b};

  const svg=d3.select('#chart').append('svg')
              .attr('viewBox',`0 0 ${W} ${H}`).style('overflow','visible');

  xScale=d3.scaleTime().domain(d3.extent(commits,d=>d.datetime))
                     .range([area.l,area.r]).nice();
  yScale=d3.scaleLinear().domain([0,24]).range([area.b,area.t]);

  svg.append('g').attr('class','gridlines')
     .attr('transform',`translate(${area.l},0)`)
     .call(d3.axisLeft(yScale).tickSize(-area.w).tickFormat(''));

  const rScale=d3.scaleSqrt()
                 .domain(d3.extent(commits,d=>d.totalLines))
                 .range([2,30]);

  const dotsG = svg.append('g').attr('class','dots');
  dotsG.selectAll('circle').data(d3.sort(commits,d=>-d.totalLines)).join('circle')
      .attr('cx',d=>xScale(d.datetime))
      .attr('cy',d=>yScale(d.hourFrac))
      .attr('r', d=>rScale(d.totalLines))
      .attr('fill','steelblue')
      .style('fill-opacity',.7)
      .on('mouseenter',(e,d)=>{d3.select(e.currentTarget).style('fill-opacity',1);
                               renderTooltipContent(d);showTip(true);moveTip(e);})
      .on('mousemove',moveTip)
      .on('mouseleave',e=>{d3.select(e.currentTarget).style('fill-opacity',.7);
                           showTip(false);});

  svg.append('g').attr('transform',`translate(0,${area.b})`).call(d3.axisBottom(xScale));
  svg.append('g').attr('transform',`translate(${area.l},0)`)
     .call(d3.axisLeft(yScale).tickFormat(d=>String(d%24).padStart(2,'0')+':00'));

  /* ---- brush ---- */
  const brush = d3.brush()
      .extent([[area.l,area.t],[area.r,area.b]])
      .on('start brush end', e=>{
          const sel=e.selection;
          d3.selectAll('circle').classed('selected',d=>isCommitSelected(sel,d));
          renderSelectionCount(sel);
          renderLanguageBreakdown(sel);
      });
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();  // keep dots above overlay
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

const data       = await loadData();
const commitList = processCommits(data);

renderCommitInfo(data, commitList);
renderScatterPlot(commitList);
