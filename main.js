
function elementSize(elm){
    const rect = elm.getBoundingClientRect();
    return [rect.width, rect.height];
}

let data;
let columns;

let padding = ({
    top: 28,
    right: 28,
    bottom: 28,
    left: 28
});

let xhr = new XMLHttpRequest();
xhr.open("GET", "penguins.csv");
xhr.responseType = ""
xhr.send();
xhr.onload = function(){
    if (xhr.status != 200) {
        console.log(`Error: ${xhr.status}: ${xhr.statusText}`);
        data = "0,0,0,0";
    } else {
        console.log(`Recieved ${xhr.response.length} bytes`);
        data = xhr.response;
    }
    data = d3.csvParse(data, d3.autoType);
    columns = data.columns.filter(d => typeof data[0][d] === "number");
    run(data)
}

function run(data){
    const SPContainer = document.getElementById("scatterplotbrush");
    SPContainer.innerHTML = '';
    const [width, height] = elementSize(SPContainer);

    let size = (width - (columns.length + 1) * padding.left) / columns.length + padding.right ;


    let x = columns.map(c => d3.scaleLinear()
        .domain(d3.extent(data, d => d[c]))
        .rangeRound([padding.left/2, size - padding.right/2]));

    let y = x.map(x => x.copy().range([size - padding.top/2, padding.bottom/2]));

    let z = d3.scaleOrdinal()
        .domain(data.map(d => d.species))
        .range(d3.schemeCategory10);

    xAxis = function(g) {
        const axis = d3.axisBottom()
            .ticks(6)
            .tickSize(size * columns.length);
        return g.selectAll("g").data(x).join("g")
            .attr("transform", (d,i) => `translate(${i * size}, 0)`)
            .each(function(d){return d3.select(this).call(axis.scale(d)); })
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));
    }

    yAxis = function(g) {
        const axis = d3.axisLeft()
            .ticks(6)
            .tickSize(-size * columns.length);
        return g.selectAll("g").data(y).join("g")
            .attr("transform", (d,i) => `translate(0,${i * size})`)
            .each(function(d){ return d3.select(this).call(axis.scale(d)); })
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));
    }

    function brushSP(data){
        const svg = d3.select("#scatterplotbrush").append("svg")
            .attr("viewBox", [-padding.right, 0, width, width]);

        svg.append("style")
            .text(`circle.hidden {fill: #000; fill0opacity: 1; r: 1px;}`);

        svg.append("g")
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        const cell = svg.append("g")
            .selectAll("g")
            .data(d3.cross(d3.range(columns.length), d3.range(columns.length)))
            .join("g")
                .attr("transform", ([i,j]) => `translate(${i * size},${j * size})`);

        cell.append("rect")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("x", padding.right/2 + 0.5)
            .attr("y", padding.top/2 + 0.5)
            .attr("width", size - padding.right)
            .attr("height", size - padding.top);

        cell.each(function([i,j]){
            d3.select(this).selectAll("circle")
                .data(data.filter(d => !isNaN(d[columns[i]]) && !isNaN(d[columns[j]])))
                .join("circle")
                    .attr("cx", d => x[i](d[columns[i]]))
                    .attr("cy", d => y[j](d[columns[j]]));
        });

        const circle = cell.selectAll("circle")
            .attr("r", 3.5)
            .attr("fill-opacity", 0.7)
            .attr("fill", d => z(d.species));

        cell.call(brush, circle, svg);

        svg.append("g")
            .style("font", "bold 10px sans-serif")
            .style("pointer-events", "none") //??
            .selectAll("text")
            .data(columns)
            .join("text")
                .attr("transform", (d, i) => `translate(${i*size}, ${i*size})`)
                .attr("x", padding.bottom)
                .attr("y", padding.left)
                .attr("dy", "0.71em")
                .text(d => d);
        svg.property("value",[]);
        return svg.node();
    }

    function brush(cell, circle, svg) {
        const brush = d3.brush()
            .extent([[padding.top /2, padding.bottom /2], [size - padding.left/2, size - padding.right/2]])
            .on("start", brushstarted)
            .on("brush", brushed)
            .on("end", brushended);

        cell.call(brush);

        let brushCell;

        //Clear the previously-active brush, if any.
        function brushstarted() {
            if (brushCell !== this){
                d3.select(brushCell).call(brush.move, null);
                brushCell = this;
            }
        }

        //highlight the selected circles.
        function brushed({selection}, [i,j]) {
            let selected = [];
            if (selection) {
                const [[x0, y0], [x1, y1]] = selection;
                circle.classed("hidden",
                    d => x0 > x[i](d[columns[i]])
                    || x1 < x[i](d[columns[i]])
                    || y0 > y[j](d[columns[j]])
                    || y1 < y[j](d[columns[j]])
                );
                selected = data.filter(
                    d => x0 < x[i](d[columns[i]])
                      && x1 > x[i](d[columns[i]])
                      && y0 < y[j](d[columns[j]])
                      && y1 > y[j](d[columns[j]])
                );
            }
            svg.property("value", selected).dispatch("input");
        }

        //If the brush is empty, select all circles.
        function brushended({selection}){
            if (selection) return;
            svg.property("value", []).dispatch("input");
            circle.classed("hidden", false);
        }
    }

    brushSP(data);

}