
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

interface StockData {
    date: number;
    close: number;
    lower: number;
    middle: number;
    upper: number;
}

async function getStockData(): Promise<StockData>{
    const data = await fetch("aapl-bollinger.csv");
    return d3.csvParse<StockData, string>(await data.text(), d3.autoType)
}

function stockGraph(data: StockData){
    const stockGraphContainer = document.getElementById("lineGraph")!;
    stockGraphContainer.innerHTML = '';
    const [width, height] = elementSize(stockGraphContainer);
    
    let x = d3.scaleUtc()
        .domain(d3.extent(data, d => d.date))
        .range([margin.left, width - margin.right]);
    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.upper)])
        .range([height - margin.bottom, margin.top]);

    let xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width/80).tickSizeOuter(0));
    let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(height/40))
        .call(g => g.select(".domain").remove());

    let line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.close));
    
    let svg = d3.select("#lineGraph").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);
    svg.append("path")
        .attr("d",`${line(data)}`)
        .attr("fill","none")
        .attr("stroke","steelblue")
        .attr("stroke-width","1.5")
        .attr("stroke-miterlimit", "1");
    svg.append("g")
        .call(xAxis);
    svg.append("g")
        .call(yAxis);
    
}

export default function stockGrapher()
{
    getStockData().then(stockGraph);
}