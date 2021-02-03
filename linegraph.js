var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function elementSize(elm) {
    const rect = elm.getBoundingClientRect();
    return [rect.width, rect.height];
}
let margin = ({
    top: 20,
    right: 30,
    bottom: 30,
    left: 40
});
function getStockData() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield fetch("aapl-bollinger.csv");
        return d3.csvParse(yield data.text(), d3.autoType);
    });
}
function stockGraph(data) {
    const stockGraphContainer = document.getElementById("lineGraph");
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
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
    let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(height / 40))
        .call(g => g.select(".domain").remove());
    let line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.close));
    let reveal = path => path.transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attrTween("stroke-dasharray", function () {
        const length = this.getTotalLength();
        return d3.interpolate(`0,${length}`, `${length},${length}`);
    });
    let svg = d3.select("#lineGraph").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);
    svg.append("path")
        .attr("d", `${line(data)}`)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5")
        .attr("stroke-miterlimit", "1")
        .call(reveal);
    svg.append("g")
        .call(xAxis);
    svg.append("g")
        .call(yAxis);
}
export default function stockGrapher() {
    getStockData().then(stockGraph);
    let replay = document.getElementById("replayAnimation");
    replay.addEventListener("click", function (e) {
        getStockData().then(stockGraph);
    });
}
//# sourceMappingURL=linegraph.js.map