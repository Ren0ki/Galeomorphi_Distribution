// -------------------- COLORS--------------------
const globalColor = d3.scaleOrdinal(['#46599e','#6d81f1','#c9b4a2', '#722B6A', '#d9915d', '#ad272c']);

// -------------------- TOOLTIP --------------------
const tooltip = d3.select("#tooltip");

function showTooltip(event, html){
    tooltip
        .style("opacity",1)
        .html(html)
        .style("left",(event.pageX+10)+"px")
        .style("top",(event.pageY-20)+"px");
}

function hideTooltip(){
    tooltip.style("opacity",0);
}

// -------------------- DATA --------------------
d3.csv("/data/Galeomorphi_Data.csv").then(data=>{

data.forEach(d=>{
    d.year = +d.year;
    d.isGaleomorphi = +d.isGaleomorphi;
});

// Set shared domain
const marineProvinces = [...new Set(data.map(d=>d.marine_province))];
globalColor.domain(marineProvinces);

// -------------------- HISTOGRAM --------------------
const histSvg = d3.select("#histogram");
const width = +histSvg.attr("width");
const height = +histSvg.attr("height");

const margin={top:20,right:20,bottom:40,left:50};
const innerWidth=width-margin.left-margin.right;
const innerHeight=height-margin.top-margin.bottom;

const values=data.map(d=>d.year);

function draw(binCount){

    histSvg.selectAll("*").remove();

    const chart=histSvg.append("g")
        .attr("transform",`translate(${margin.left},${margin.top})`);

    const x=d3.scaleLinear()
        .domain([1940, d3.max(values)])
        .range([0,innerWidth]);

    const bins=d3.bin()
        .domain(x.domain())
        .thresholds(binCount)(values);

    const y=d3.scaleLinear()
        .domain([0,d3.max(bins,d=>d.length)])
        .range([innerHeight,0]);

    chart.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x",d=>x(d.x0))
        .attr("y",d=>y(d.length))
        .attr("width",d=>Math.max(0,x(d.x1)-x(d.x0)-1))
        .attr("height",d=>innerHeight-y(d.length))
        .attr("fill",globalColor(marineProvinces[0]))
        .on("mousemove",(event,d)=>{
            showTooltip(event,
                `<b>Range:</b> ${d.x0} - ${d.x1}<br>Galean Shark Sightings: ${d.length}`);
        })
        .on("mouseout",hideTooltip);

    chart.append("g")
        .attr("transform","translate(0,"+innerHeight+")")
        .call(d3.axisBottom(x))
          .selectAll("text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end");

    chart.append("g")
        .call(d3.axisLeft(y));
}

draw(20);

d3.select("#binSlider").on("input",function(){
    draw(this.value);
});

// -------------------- PIE CHART --------------------
const pieSvg=d3.select("#piechart")
    .append("g")
    .attr("transform","translate(150,150)");

const summary=d3.rollups(
    data,
    v=>d3.sum(v,d=>d.isGaleomorphi),
    d=>d.marine_province
).map(([marine_province,total])=>({marine_province,total}));

const pie=d3.pie()
    .value(d=>d.total);

const arcs = pie(summary);

const arc=d3.arc()
    .innerRadius(0)
    .outerRadius(90);

pieSvg.selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d",arc)
    .attr("fill",d=>globalColor(d.data.marine_province))
    .on("mousemove",(event,d)=>{
        showTooltip(event,
            `<b>${d.data.marine_province}</b><br>Galean Sharks Recorded: ${d.data.total}`);
    })
    .on("mouseout",hideTooltip);

});

// -------------------- STACKED BAR --------------------
d3.csv("/data/Galeomorphi_Stacked.csv").then(data=>{

const margin = {top:10,right:30,bottom:90,left:50},
      width = 250 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

const svg = d3.select("#stacked")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",`translate(${margin.left},${margin.top})`);

const subgroups = data.columns.slice(1);
const groups = data.map(d=>d.group);

const x = d3.scaleBand()
    .domain(groups)
    .range([0,width])
    .padding(0.2);

svg.append("g")
    .attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

const y = d3.scaleLinear()
    .domain([0,300])
    .range([height,0]);

svg.append("g").call(d3.axisLeft(y));

const stackedData = d3.stack().keys(subgroups)(data);

svg.append("g")
  .selectAll("g")
  .data(stackedData)
  .enter().append("g")
    .attr("fill", d => globalColor(d.key))
  .selectAll("rect")
  .data(d=>d)
  .enter().append("rect")
    .attr("x", d=>x(d.data.group))
    .attr("y", d=>y(d[1]))
    .attr("height", d=>y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mousemove",(event,d)=>{
        showTooltip(event,`Count Per Species: ${d[1]-d[0]}`);
    })
    .on("mouseout",hideTooltip);

});

// -------------------- SCATTER 3D --------------------
d3.csv("/data/Galeomorphi_Surface.csv").then(rows => {

function unpack(rows, key) {
    return rows.map(row => +row[key]);
}

const trace = {
    x: unpack(rows, 'x1'),
    y: unpack(rows, 'y1'),
    z: unpack(rows, 'z1'),
    mode: 'markers',
    type: 'scatter3d',
    marker: {
        size: 4,
        opacity: 0.8
    }
};

Plotly.newPlot('scatter3d', [trace], {
    margin: {l: 0, r: 0, b: 0, t: 0},
        height: '1000px',
    paper_bgcolor: 'rgba(0,0,0,0)',
    scene: {
        bgcolor: 'rgba(0,0,0,0)',
        xaxis: {title: 'Longitude'},
        yaxis: {title: 'Latitude'},
        zaxis: {title: 'Sightings'}
    }
}, {
    responsive: true,
    displayModeBar: false  
  }

);

});