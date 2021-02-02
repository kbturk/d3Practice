/*import * as topojson from "./topojson-client";*/

let sphere = ({type: "Sphere"});

let padding = ({
    top: 28,
    right: 28,
    bottom: 28,
    left: 28
});

function elementSize(elm: HTMLElement): [number, number]{
    const rect = elm.getBoundingClientRect();
    return [rect.width, rect.height];
}
/*
function height(sphere: "Sphere"): number {
    const[[x0, y0], [x1, y1]] = d3.geoPath(projection.fitWidth(width, sphere)).bounds(sphere);
    const dy = Math.ceil(y1 - y0), l = Math.min(Math.ceil(x1 - x0), dy);
    projection.scale(projection.scale() * (l-1)/1).precision(0.2);
    return dy;
}*/

function drag(projection) {
    let v0, q0, r0, a0, l;
    
    function pointer(event, that){
        const t = d3.pointers(event, that);
        
        if (t.length !== l){
            l = t.length;
            if (l > 1) a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
            dragstarted.apply(that, [event,that]);
        }

        // for multitouch, average positions and compute rotation.
        if (l > 1){
            const x = d3.mean(t, p => p[0]);
            const y = d3.mean(t, p => p[1]);
            const a = Math.atan2(t[1][1] - t[0][1], t[1][0]-t[0][0]);
            return [x, y, a];
        }
        
        return t[0];
    }
    
    function dragstarted(event){
        v0 = versor.cartesian(projection.invert(pointer(event, this)));
        q0 = versor(r0 = projection.rotate());
    }
    
    function dragged(event){
        const p = pointer(event, this);
        const v1 = versor.cartesian(projection.rotate(r0).invert(p));
        const delta = versor.delta(v0,v1);
        let q1 = versor.multiply(q0, delta);

        //for multitouch, compose with a rotation around the axis.
        if (p[2]) {
            const d = (p[2] - a0) / 2;
            const s = -Math.sin(d);
            const c = Math.sign(Math.cos(d));
            q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
        }
    
        projection.rotate(versor.rotation(q1));
    
        //in vicinity of the antipode (unstable) of q0, restart.
        if (delta[0] < 0.7) dragstarted.apply(this, [event, this]);
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged);
}

interface WorldData {
    land110: object;
    land50: object;
}

async function getWorldData(): Promise<WorldData>
{
    const jsonLand110 = await fetch("land-110m.json");
    const jsonLand50 = await fetch("land-50m.json");
    const land110 = await jsonLand110.json();
    const land50 = await jsonLand50.json();
    return {
        land110: topojson.feature(land110, land110.objects.land),
        land50: topojson.feature(land50, land50.objects.land)
    };        
}

function worldBuilder({land110, land50}: WorldData) {
    //Select container
    const planetContainer = document.getElementById("planetDrag")!;
    planetContainer.innerHTML = "";
    const [width, height] = elementSize(planetContainer);

    //Select projection
    let projectName = document.querySelector("#viewSelector").value;
    let projection = d3[projectName]().precision(0.1);

    console.log(land110);

    const context = d3.select(`#planetDrag`).append('canvas')
        .attr("width", width)
        .attr("height",height)
        .style("position", "absolute")
        .style("top", "${padding.top}px")
        .style("left", "${padding.left}px")
        .node()!.getContext("2d")!;
    const path = d3.geoPath(projection, context);
    
    function render(land) {
        context.clearRect(0,0, width, height);
        context.beginPath(), path(sphere), context.fillStyle = "#fff", context.fill();
        context.beginPath(), path(land), context.fillStyle = "#000", context.fill();
        context.beginPath(), path(sphere), context.stroke();
    }
    
    return d3.select(context.canvas)
        .call(drag(projection)
            .on("drag.render", () => render(land110))
            .on("end.render", () => render(land50)))
        .call(() => render(land50))
        .node();
}

export default function makeplanetdrag()
{
    getWorldData().then(worldBuilder);
}

makeplanetdrag();