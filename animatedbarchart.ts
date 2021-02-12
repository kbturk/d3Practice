
function elementSize(elm: HTMLElement): [number, number]{
    const rect = elm.getBoundingClientRect();
    return [rect.width, rect.height];
}

let margin = ({
    top: 20,
    right: 30,
    bottom: 30,
    left: 40
});

interface BrandData {
    date: number;
    name: string;
    category: string;
    value: number;
}

async function getBrandData(): Promise<d3.DSVParsedArray<BrandData>>{
    const data = await fetch("category-brands.csv");
    return d3.csvParse<BrandData, string>(await data.text(), d3.autoType)
}
function brandGraph(data: d3.DSVParsedArray<BrandData>){

const graphDuration = 2500;
const n = 12;
const k = 5;
const barSize = 48;

const brandGraphContainer = document.getElementById("barGraph")!;
brandGraphContainer.innerHTML = '';
const [width, height] = elementSize(brandGraphContainer);

const names = new Set(data.map(d => d.name));
const dataValues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.name))
    .map(([date, data]) => [new Date(date), data])
    .sort(([a], [b]) => d3.ascending(a, b));
// console.log(dataValues)
function rank(value){
    const data2 = Array.from(names, name => 
    ({name, value: value(name)}));
    data2.sort((a,b) => d3.descending(a.value, b.value));
    for (let i = 0; i< data2.length; ++i) data2[i].rank = Math.min(n,i);
    return data2;
}
    
function getKeyFrames(dataValues){
    const keyframes = [];
    let ka, a, kb, b;
    for ([[ka, a], [kb, b]] of d3.pairs(dataValues)){
        for (let i = 0; i < k; ++i){
            const t = i /k;
            keyframes.push([
                new Date(ka * (1 - t) + kb*t),
                rank(name => (a.get(name) || 0)*(1 - t) + (b.get(name) || 0)*t)
            ]);
        }
    }
    keyframes.push([new Date(kb), rank(name => b.get(name) || 0)]);
    return keyframes;
}

//get the keyframes:
let keyframes = getKeyFrames(dataValues);

let nameframes = d3.groups(keyframes.flatMap(([, data]) => data), d => d.name);

let prev = new Map(nameframes.flatMap(([, data]) => d3.pairs(data, (a,b) => [b,a])));
let next = new Map(nameframes.flatMap(([,data]) => d3.pairs(data)));

function textTween(a, b) {
  const i = d3.interpolateNumber(a, b);
  return function(t) {
    this.textContent = d3.format(",d")(i(t));
  };
}

let x = d3.scaleLinear([0,1], [margin.left, width - margin.right]);
let y = d3.scaleBand()
            .domain(d3.range(n + 1))
            .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
            .padding(0.1);

function axis(svg) {
  const g = svg.append("g")
      .attr("transform", `translate(0,${margin.top})`);

  const axis = d3.axisTop(x)
      .ticks(width / 160)
      .tickSizeOuter(0)
      .tickSizeInner(-barSize * (n + y.padding()));

  return (_, transition) => {
    g.transition(transition).call(axis);
    g.select(".tick:first-of-type text").remove();
    g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
    g.select(".domain").remove();
  };
}

function ticker(svg) {
  const now = svg.append("text")
      .style("font", `bold ${barSize}px var(--sans-serif)`)
      .style("font-variant-numeric", "tabular-nums")
      .attr("text-anchor", "end")
      .attr("x", width - 6)
      .attr("y", margin.top + barSize * (n - 0.45))
      .attr("dy", "0.32em")
      .text(d3.utcFormat("%Y")(keyframes[0][0]));

  return ([date], transition) => {
    transition.end().then(() => now.text(d3.utcFormat("%Y")(date)));
  };
}

function colorScale() {
  const scale = d3.scaleOrdinal(d3.schemeTableau10);
  if (data.some(d => d.category !== undefined)) {
    const categoryByName = new Map(data.map(d => [d.name, d.category]))
    scale.domain(categoryByName.values());
    return d => scale(categoryByName.get(d.name));
  }
  return d => scale(d.name);
}

let color = colorScale();

function bars(svg) {
  let bar = svg.append("g")
      .attr("fill-opacity", 0.6)
    .selectAll("rect");

  return ([date, data], transition) => bar = bar
    .data(data.slice(0, n), d => d.name)
    .join(
      enter => enter.append("rect")
        .attr("fill", color)
        .attr("height", y.bandwidth())
        .attr("x", x(0))
        .attr("y", d => y((prev.get(d) || d).rank))
        .attr("width", d => x((prev.get(d) || d).value) - x(0)),
      update => update,
      exit => exit.transition(transition).remove()
        .attr("y", d => y((next.get(d) || d).rank))
        .attr("width", d => x((next.get(d) || d).value) - x(0))
    )
    .call(bar => bar.transition(transition)
      .attr("y", d => y(d.rank))
      .attr("width", d => x(d.value) - x(0)));
}

function labels(svg) {
  let label = svg.append("g")
      .style("font", "bold 12px var(--sans-serif)")
      .style("font-variant-numeric", "tabular-nums")
      .attr("text-anchor", "end")
    .selectAll("text");

  return ([date, data], transition) => label = label
    .data(data.slice(0, n), d => d.name)
    .join(
      enter => enter.append("text")
        .attr("transform", d => `translate(${x((prev.get(d) || d).value)},${y((prev.get(d) || d).rank)})`)
        .attr("y", y.bandwidth() / 2)
        .attr("x", -6)
        .attr("dy", "-0.25em")
        .text(d => d.name)
        .call(text => text.append("tspan")
          .attr("fill-opacity", 0.7)
          .attr("font-weight", "normal")
          .attr("x", -6)
          .attr("dy", "1.15em")),
      update => update,
      exit => exit.transition(transition).remove()
        .attr("transform", d => `translate(${x((next.get(d) || d).value)},${y((next.get(d) || d).rank)})`)
        .call(g => g.select("tspan").tween("text", d => textTween(d.value, (next.get(d) || d).value)))
    )
    .call(bar => bar.transition(transition)
      .attr("transform", d => `translate(${x(d.value)},${y(d.rank)})`)
      .call(g => g.select("tspan").tween("text", d => textTween((prev.get(d) || d).value, d.value))));
}
      
    //make the graph
    let svg = d3.select("#barGraph").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);
    const updateBars = bars(svg);
    const updateAxis = axis(svg);
    const updateLabels = labels(svg);
    const updateTicker = ticker(svg);
    // console.log(updateBars);
    //yield svg.node();
    
    for (const keyframe of keyframes){
        const transition = svg.transition()
            .duration(graphDuration)
            .ease(d3.easeLinear);
            //Extract the top bar's value:
            x.domain([0,keyframe[1][0].value]);
            
            updateAxis(keyframe, transition);
            updateBars(keyframe, transition);
            updateLabels(keyframe, transition);
            updateTicker(keyframe, transition);
            /*
            invalidation.then(() =>
            svg.interrupt());
            await transition.end();*/
    }
}


export default function brandGrapher()
{
    getBrandData().then(brandGraph);
        let replayBar = document.getElementById("replayBarGraph");

    replayBar.addEventListener("click", function(e) {
    getBrandData().then(brandGraph)});

}