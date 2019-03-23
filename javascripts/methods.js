Vue.config.devtools = true;

const title = "Methods: Individual Patient Pathway Analysis";


const show = d3slideshow.create('#methods', title, 'slide');

let Stages, patient;


d3.queue()
    .defer(d3.json, "data/stages.json")
    .defer(d3.json, "data/psu.json")
    .await(function (error, stages, p) {
        patient = formPathway(p);
        Stages = stages;

        const colourN = d3.scaleOrdinal(d3.schemeCategory20c).domain(stages.StateN);

        show.appendFigure("Records")
            .event("init", function () {
                this.fullSize = {
                    top: 0,
                    left: 0,
                    rX: 0.9,
                    rY: 0.9
                };
                this.smallSize = {
                    top: 0,
                    left: 0,
                    rX: 0.3,
                    rY: 0.2
                };
                this.currentSize = this.fullSize;

                const loc = this.currentSize;
                const h = this.height * loc.rY,
                    w = this.width * loc.rX;

                const x = d3.scaleLinear().domain([0, d3.max(patient.Records.map(function (d) {
                    return d.Time;
                }))]).range([0, w]);

                const y = d3.scaleLinear().domain([0, 1]).range([0, h]);
                const y3 = d3.scaleBand().domain(stages.StateN).range([0, h]).padding(0.25);
                this.elements.y = y;
                this.elements.y3 = y3;
                this.elements.x = x;

                patient.Records.forEach(function (d) {
                    d.Rand = Math.random();
                    d.Label = (d.Pre) ? "None Pre" : (d.Tre) ? "None Tre" : "None Eva";
                    d.Timeout = (d.Pre) ? settings.Timeout.Pre : (d.Tre) ? settings.Timeout.Tre + d.Event.Drug.Days : settings.Timeout.Eva;
                });
                this.elements.points = this.g.selectAll(".record").data(patient.Records)
                    .enter().append("circle").attr("class", "record")
                    .attr("cx", (d) => x(d.Time))
                    .attr("cy", (d) => y(d.Rand))
                    .attr("r", 5).style("fill", "#777");

                this.g.selectAll(".sub").data(["None Pre", "None Eva", "None Tre"])
                    .enter()
                    .append('text')
                    .attr("class", "sub")
                    .attr("x", this.elements.x(0))
                    .attr("y", (d) => this.elements.y3(d) + 30)
                    .text((d) => (d === "None Pre") ? "Related Dz" : (d === "None Tre") ? "Treatment" : "Evalution");

            })
            .event('spread', function () {
                    this.elements.points.transition().duration(500)
                        .attr("cy", (d) => this.elements.y(d.Rand))
                        .style("fill", "#777");
                    this.g.selectAll(".sub").style("opacity", 0);
                })
            .event('align', function () {
                    this.elements.points.transition().duration(500)
                        .attr("cy", (d) => this.elements.y3(d.Label) - d.Rand * 20)
                        .style("fill", (d) => colourN(d.Label));
                    this.g.selectAll(".sub").style("opacity", 1);
                });

        show.appendFigure("Subfields")
            .event("init", function () {
                this.fullSize = {
                    top: 0,
                    left: 0,
                    rX: 0.9,
                    rY: 0.9
                };
                this.smallSize = {
                    top: this.height * 0.2,
                    left: 0,
                    rX: 0.3,
                    rY: 0.4
                };
                this.currentSize = this.fullSize;

                let loc = this.currentSize;
                let h = this.height * loc.rY, w = this.width * loc.rX;

                const x = d3.scaleLinear().domain([0, d3.max(patient.Records.map((d) => d.Time))]).range([0, w]);

                const yN = d3.scaleBand().domain(stages.StateN).range([0, h]).padding(0.25);

                this.elements.points = this.g.selectAll(".record").data(patient.Records)
                    .enter().append("circle").attr("class", "record")
                    .attr("cx", (d) => x(d.Time))
                    .attr("cy", (d) => yN(d.Label) - d.Rand * 20)
                    .attr("r", 5).style("fill", (d) => colourN(d.Label));

                this.elements.timeouts = this.g.selectAll(".timeout").data(patient.Records)
                    .enter().append("line").attr("class", "timeout")
                    .attr("x1", (d) => x(d.Time))
                    .attr("x2", (d) => x(d.Time + d.Timeout))
                    .attr("y1", (d) => yN(d.Label) - d.Rand * 20)
                    .attr("y2", (d) => yN(d.Label) - d.Rand * 20)
                    .style("stroke", (d) => colourN(d.Label));

                patient.Histories.Pre.filter((v) => v.State === "None").forEach((v) => v.State = "None Pre");
                patient.Histories.Eva.filter((v) => v.State === "None").forEach((v) => v.State = "None Eva");
                patient.Histories.Tre.filter((v) => v.State === "None").forEach((v) => v.State = "None Tre");

                patient.Histories.Pre.forEach(function (v) {
                    patient.Records
                        .filter((d) => (d.Label === "None Pre") & (d.Time >= v.Time) & (d.Time < v.End))
                        .forEach((d) => (d.State = v.State))
                });

                patient.Histories.Eva.forEach(function (v) {
                    patient.Records
                        .filter((d) => (d.Label === "None Eva") & (d.Time >= v.Time) & (d.Time < v.End))
                        .forEach((d) => (d.State = v.State))
                });

                patient.Histories.Tre.forEach(function (v) {
                    patient.Records
                        .filter((d) => (d.Label === "None Tre") & (d.Time >= v.Time) & (d.Time < v.End))
                        .forEach((d) => (d.State = v.State))
                });

                let hs = d3.values(patient.Histories).reduce((s, n) => s.concat(n), []);



                this.elements.paths = this.g.selectAll(".stage").data(hs)
                    .enter().append("line").attr("class", "stage")
                    .attr("x1", (d) => x(d.Time))
                    .attr("x2", (d) => x(d.End))
                    .attr("y1", (d) => yN(d.State))
                    .attr("y2", (d) => yN(d.State))
                    .attr("stroke-width", 3)
                    .style("stroke", (d) => colourN(d.State));

                this.g.selectAll(".sub").data(["None Pre", "None Eva", "None Tre"])
                    .enter()
                    .append('text')
                    .attr("class", "sub")
                    .attr("x", x(0))
                    .attr("y", (d) => yN(d) + 30)
                    .text((d) => (d === "None Pre") ? "Related Dz" : (d === "None Tre") ? "Treatment" : "Evaluation");

                this.elements.x = x;
                this.elements.yN = yN;
        })
            .event("show_timeouts", function () {
              this.elements.timeouts.attr("x2", (d) => this.elements.x(d.Time))
                  .style("opacity", 1).transition().duration(500)
                  .attr("x2", (d) => this.elements.x(d.Time + d.Timeout));
            })
            .event("hide_timeouts", function () {
              this.elements.timeouts.style("opacity", 0);
            })
            .event("show_paths", function () {
              this.elements.paths.attr("x2", (d) => this.elements.x(d.Time))
                  .style("opacity", 1)
                  .transition().duration(500)
                  .attr("x2", (d) => this.elements.x(d.End));
            })
            .event("hide_paths", function () {
              this.elements.paths.style("opacity", 0);
            })
            .event("hide_points", function () {
              this.elements.points.style("opacity", 1);
            })
            .event("show_spread_points", function () {
              this.elements.points.attr("r", 5)
                  .attr("cy", (d) => this.elements.yN(d.Label) - d.Rand * 20)
                  .style("fill", (d) => colourN(d.Label));
            })
            .event("show_fitted_points", function () {
              this.elements.points
                .transition().duration(500)
                .attr("r", 2)
                .attr("cy", (d) => this.elements.yN(d.State))
                .style("fill", (d) => colourN(d.State));
            });


        show.appendFigure("Episodes")
            .event("init", function () {
              this.fullSize = {
                  top: 0,
                  left: 0,
                  rX: 0.9,
                  rY: 0.9
              };
              this.smallSize = {
                  top: this.height * 0.6,
                  left: 0,
                  rX: 0.3,
                  rY: 0.4
              };
              this.currentSize = this.fullSize;

              let loc = this.currentSize;
              let h = this.height * loc.rY,
                  w = this.width * loc.rX;

              const x = d3.scaleLinear().domain([0, d3.max(patient.Records.map((d) => d.Time))]).range([0, w]);

              const y3 = d3.scaleLinear().domain([0, 3]).range([0.1, h * 0.9]);

              let stages = patient.Episodes.map(function (e) {
                  if (!e.Time) return [];
                  return [
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: (e.Pre === "None") ? "None Pre" : e.Pre,
                          Label: 0
                      },
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: (e.Eva === "None") ? "None Eva" : e.Eva,
                          Label: 1
                      },
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: (e.Tre === "None") ? "None Tre" : e.Tre,
                          Label: 2
                      }
                  ]
              }).reduce((s, a) => s.concat(a), []);

              this.elements.stages = this.g.selectAll(".stage").data(stages)
                  .enter().append("rect").attr("class", "stage")
                  .attr("x", (d) => x(d.Time))
                  .attr("y", (d) => y3(d.Label))
                  .attr("width", (d) => x(d.End - d.Time))
                  .attr("height", (d) => y3(1))
                  .style("fill", (d) => colourN(d.Stage))
                  .style("stroke", (d) => colourN(d.Stage));

              this.elements.bands = this.g.selectAll(".cut").data(patient.Cutpoints)
                  .enter().append("rect").attr("class", "cut")
                  .attr("x", (d) => x(d.From))
                  .attr("y", (d) => y3.range()[0])
                  .attr("width", (d) => x(d.To - d.From))
                  .attr("height", (d) => y3.range()[1] - y3.range()[0])
                  .style("opacity", 0.8)
                  .style("fill", "#FFF");

              this.elements.exc = this.g.selectAll(".exc").data(patient.AllPathways.filter((p) => p.Type !== "TB"))
                  .enter().append("rect").attr("class", "exc")
                  .attr("x", (d) => x(d.StartTime))
                  .attr("y", (d) => y3.range()[0])
                  .attr("width", (d) => x(d.EndTime - d.StartTime))
                  .attr("height", (d) => y3.range()[1] - y3.range()[0])
                  .style("opacity", 0.8)
                  .style("fill", "#CCC");
            })
            .event("show_bands", function () {
              this.elements.bands.transition().duration(100).style("opacity", 0.8);
            })
            .event("hide_bands", function () {
              this.elements.bands.style("opacity", 0);
            })
            .event("show_exc", function () {
              this.elements.exc.transition().duration(100).style("opacity", 0.8);
            })
            .event("hide_exc", function () {
              this.elements.exc.transition().style("opacity", 0);
            });

        show.appendFigure("Pathways")
            .event("init", function () {
                this.fullSize = {
                  top: 0,
                  left: 0,
                  rX: 0.9,
                  rY: 0.9
                };
                this.smallSize = {
                  top: 0,
                  left: this.width *0.4,
                  rX: 3/5,
                  rY: 0.6
                };
                this.currentSize = this.fullSize;

                let loc = this.currentSize;
                let h = this.height * loc.rY, w = this.width * loc.rX;
                this.w = w;
                const y = d3.scaleLinear().range([0, h]);

                const x3 = d3.scaleLinear().domain([0, 3]).range([0, w * 0.1]);

                activePathway = 2;
                activePathway = (patient.TBPathways[activePathway]) ? activePathway : 0;
                let path = patient.TBPathways[activePathway];

                y.domain([path.StartTime, path.EndTime]);

                this.elements.frag = path.Episode.map(function (e) {
                  if (!e.Time || (e.Pre === "None" & e.Eva === "None" & e.Tre === "None")) return [];
                  return [
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: e.Pre,
                          Label: 0
                      },
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: e.Eva,
                          Label: 1
                      },
                      {
                          Time: e.Time,
                          End: e.End,
                          Stage: e.Tre,
                          Label: 2
                      }
                  ]
                }).reduce((s, a) => s.concat(a), []);

                this.elements.stages = this.g.selectAll(".stage").data(this.elements.frag)
                  .enter().append("rect").attr("class", "stage")
                  .attr("x", (d) => x3(d.Label))
                  .attr("y", (d) => y(d.Time))
                  .attr("width", (d) => x3(1))
                  .attr("height", (d) => Math.abs(y(d.Time) - y(d.End)))
                  .style("fill", (d) => (Stages.StateN.indexOf(d.Stage) >= 0) ? colourN(d.Stage) : "#FFF")
                  .style("stroke", (d) => (Stages.StateN.indexOf(d.Stage) >= 0) ? colourN(d.Stage) : "#FFF");


                this.elements.yTime = d3.scalePoint()
                  .domain(["Start", "Evaluation", "Re-evaluation", "Confirmation", "End"]).range([0, h]).padding(0.1);

                this.elements.timings = this.g.selectAll(".timing").data(path.Timings).enter()
                  .append("g");

                this.elements.timings.append("circle")
                  .attr("cy", (d) => this.elements.yTime(d.Stage))
                  .attr("cx", 0)
                  .attr("r", 3)
                  .style("fill", "#777");

                this.elements.timings.append("text")
                  .attr("y", (d) => this.elements.yTime(d.Stage))
                  .attr("x", 0)
                  .attr("dy", 16)
                  .text((d) => (d.Stage))
                  .style("fill", "black");

                this.elements.timingLines = this.g.selectAll(".timingline").data(path.Timings).enter()
                  .append("line")
                  .attr("class", "timingline")
                  .attr("x1", w * 0.1)
                  .attr("x2", w / 3)
                  .attr("y1", (d) => y(d.Time))
                  .attr("y2", (d) => this.elements.yTime(d.Stage))
                  .style("stroke", "black")
                  .style("stroke-dasharray", "5,2");

                colour = d3.scaleOrdinal(d3.schemeCategory20c).domain(settings.Stages20);

                const forceStrength = 0.9, nodeSize = 15;
                let pathNodes = path.Pattern.map((e) => e);
                pathNodes.unshift({Stage: "Start", Time: path.StartTime});
                pathNodes.push({Stage: "End", Time: path.EndTime});
                console.log(pathNodes);
                let pathEdges = [];
                for (let i = 0; i < pathNodes.length - 1; i += 1) {
                  pathEdges.push({
                      "source": pathNodes[i].Stage,
                      "target": pathNodes[i + 1].Stage
                  });
                }

                const yLevel = d3.scaleBand().domain(settings.Stages4).range([0, h]);
                let ts = Array.from(new Set(pathNodes.map((d) => d.Time))).sort(function (a, b) {
                  return a - b;
                });
                const xTime = d3.scaleBand().domain(ts).range([w * 0.3, w * 0.6]);

                pathNodes.forEach((e) => console.log(settings.Levels[e.Stage]));

                pathNodes.forEach((e) => {
                   if (e.Stage === "Start") {
                       e.posY = 0;
                   } else if (e.Stage === "End") {
                       e.posY = 0.97 * h;
                   } else {
                       settings.Levels[e.Stage].N_Events += 1;
                   }
                });

                d3.nest()
                    .key(e => settings.Levels[e.Stage])
                    .entries(pathNodes.filter(e => e.posY === undefined))
                    .forEach(kv => {
                        let y0 = yLevel(kv.key);
                        let bw = yLevel.bandwidth();
                        kv.values.forEach((e, i) => {
                            e.posY = y0 + (i + 0.5) * bw;
                        })
                    });

                force = d3.forceSimulation().nodes(pathNodes)
                  .velocityDecay(0.6)
                  .force("link", d3.forceLink().links(pathEdges).id((d) => d.Stage).strength(0.01))
                  .force('x', d3.forceX((d) => (d.Stage==="Start")? xTime.range()[0]-50: (d.Stage==="End")? xTime.range()[1]+50: xTime(d.Time)).strength(forceStrength))
                  .force('y', d3.forceY((d) => d.posY).strength(forceStrength))
                  .force('charge', d3.forceManyBody(0.1))
                  .force("collide", d3.forceCollide(1));
                //.force("links", d3.forceLink(pathEdges).strength(0.01));

                const nodes = this.g.selectAll(".node")
                  .data(pathNodes)
                  .enter().append("g")
                  .attr("class", "node");

                this.elements.nodes = nodes;

                nodes.append("circle")
                  .attr("r", nodeSize)
                  .style("fill", (d) => colour(d.Stage));


                links = this.g.selectAll(".link")
                  .data(pathEdges)
                  .enter()
                  .append("line")
                  .attr("class", "link")
                  .attr("stroke", (d) => (d.source.Stage ==="Start" | d.target.Stage==="End")?"#ccc": "black")
                .style("stroke-width", (d) => (d.source.Stage ==="Start" | d.target.Stage==="End")?1: 3)

                this.elements.links = links;


                nodes.append("title")
                  .text((d) => d.Stage);

                nodes.append("text")
                  .attr("dy", 0)
                  .attr("dx", nodeSize + 10)
                  .text((d) => d.Stage);

                force.on("tick", function () {
                    nodes.attr("transform", (d) => "translate(" + d.x + ", " + d.y + ")");
                    links
                      .attr("x1", function (d) {
                          let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                          return d.source.x + Math.sin(angle) * nodeSize;
                      })
                      .attr("y1", function (d) {
                          let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                          return d.source.y + Math.cos(angle) * nodeSize;
                      })
                      .attr("x2", function (d) {
                          let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                          return d.target.x - Math.sin(angle) * nodeSize;
                      })
                      .attr("y2", function (d) {
                          let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                          return d.target.y - Math.cos(angle) * nodeSize;
                      });
                });
            })
            .event("show_stages", function () {
                this.elements.stages.transition().duration(100).style("opacity", 1);
            })
            .event("hide_stages", function () {
                this.elements.stages.style("opacity", 0);
            })
            .event("show_timing", function () {
                this.elements.timings.transition().duration(100).style("opacity", 1);
                this.elements.timingLines.transition().duration(100).style("opacity", 1);
                //timingLabels.transition().duration(100).style("opacity", 1);
            })
            .event("hide_timing", function () {
                this.elements.timings.style("opacity", 0);
                this.elements.timingLines.style("opacity", 0);
                //timingLabels.style("opacity", 0);
            })
            .event("show_pathway", function () {
                this.elements.timingLines.style("opacity", 0);
                this.elements.timings.transition().duration(100).attr("transform",function(d) {
                    return  "translate(" + this.w/7 + ", 0)";
                })
                    .style("opacity", 1);
                //timingLabels.transition().duration(100).attr("x", w / 7).style("opacity", 0.8);
                this.elements.nodes.transition().duration(100).style("opacity", 0.8);
                this.elements.links.transition().duration(100).style("opacity", 0.8);
            })
            .event("hide_pathway", function () {
                this.elements.timingLines.style("opacity", 0);
                this.elements.timings.attr("transform", (d) => "translate(" + this.w/3 + ", 0)");
                //timingLabels.attr("x", w / 3);
                this.elements.nodes.style("opacity", 0);
                this.elements.links.style("opacity", 0);
            });

        show.appendFigure("Statistics")
            .event("init", function () {
                let activePathway = 2;
                activePathway = (patient.TBPathways[activePathway]) ? activePathway : 0;
                let path = patient.TBPathways[activePathway];


                const sts = [
                    {Name: "EvaluationDelay", Desc: "Evaluation Delay"},
                    {Name: "DiagnosisDelay", Desc: "Diagnosis Delay"},
                    {Name: "LostAwareness", Desc: "Awareness Lost"},
                    {Name: "EmpiricalTreatment", Desc: "Empirical Treatment used"},
                    {Name: "Notification", Desc: "Day of Notification"},
                    {Name: "Outcome", Desc: "Treatment Outcome"}
                ];
                sts.forEach((d, i) => {
                    this.g.append("text").text(d.Desc+":\t "+path.Statistics[d.Name])
                        .attr("y", i*20).style("font-size", "12");
                });
                this.g.attr("transform", "translate("+( + this.width *1.5/ 3)+","+ this.height*2.2/3+")")

            });

        function focusOn(figs, sub) {
            main = d3slideshow.highlight(figs, sub);
            let diag, loc;
            ["Records", "Subfields", "Episodes", "Pathways"].forEach(function(k) {
                let loc;
                diag = figs[k];
                if (diag === main) {
                    loc = diag.fullSize;
                    diag.currentSize = loc;
                    diag.g.style("opacity", 1).style("display", "inline")
                            .attr("transform", "translate(" + loc.left + "," + loc.top + ")");
                } else {
                    loc = diag.smallSize;
                    diag.currentSize = loc;
                    diag.g
                        .style("opacity", 0).style("display", "none")
                        .attr("transform", "translate(" + loc.left + "," + loc.top + ")" + "scale(" + loc.rX + "," + loc.rY + ")");
                }
            });
            return main;
        }

        function spreadAll(figs) {
            let diag, loc;
            ["Records", "Subfields", "Episodes", "Pathways"].forEach(function(k) {
                diag = figs[k];
                loc = diag.smallSize;
                diag.currentSize = loc;
                diag.g.transition().duration(100)
                    .style("opacity", 1).style("display", "inline")
                    .attr("transform", "translate(" + loc.left + "," + loc.top + ")" + "scale(" + loc.rX + "," + loc.rY + ")");
            });
            figs.Statistics.show();
        }

        show.appendSlide()
            .text('Chapter', 'Overview')
            .text('Section', 'Input')
            .text('Context', `
In the beginning, the data are records
`)
            .event("activate", function(figs) {
                fig = focusOn(figs, "Records");
                fig.spread();
            });


        show.appendSlide()
            .text('Chapter', 'Overview')
            .text('Section', 'Expected Output')
            .text('Context', `
The targeted outputs are patient pathways.
`).event("activate", function(figs) {
            spreadAll(figs);
            figs.Records.spread();

            figs.Subfields.hide_timeouts();
            figs.Subfields.show_paths();
            figs.Subfields.show_fitted_points();

            figs.Episodes.show_bands();
            figs.Episodes.show_exc();

            figs.Pathways.hide_stages();
            figs.Pathways.hide_timing();
            figs.Pathways.show_pathway();
            figs.Pathways.show_statistics();
        });

        show.appendSlide()
            .text('Chapter', 'From records to three dimensions')
            .text('Section', 'Step 1-1: Leballing')
            .text('Context', `
Find out the meaning of each record.
Records can be
- **Related illness:** the diagnosis for diseases which have similar symptoms. This kind of diseases highlights the start of a patient pathway. For example, a tuberculosis case usually starts with a diagnosis for an acute respiratory disease. 
- **Evaluation** the history of evaluating tool prescription. 
- **Treatment** the prescriptions with drugs for treating the targeted disease. 

The first two can be reduced considering the information in the data while the information about treatment is the minimal for the IPPA. 

Every record can have multiple meaning. 
For example, an anti-TB durg prescriton with the amount below standard treatment can be seen as an empirical treatment or treatment initialisation. 
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Records");
                fig.spread();
            });

        show.appendSlide()
            .text('Chapter', 'From records to three dimensions')
            .text('Section', 'Step 1-2: Mapping to dimensions')
            .text('Context', `
Group records by their fields.
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Records");
                fig.align();
            });


        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-1: Extending time-out')
            .text('Context', `
The events happen at certain time points but the affects will sustain more than those points. Time-out is a waiting time for the next event in the same dimensions. Long time-out might introduces irrelevant events; short time-out causes fragmentation.
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Subfields");
                fig.hide_paths();
                fig.show_spread_points();
                fig.show_timeouts();
            });


        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-2: Constructing sub-episodes')
            .text('Context', `
Based on the **Time-out** in the previous step, this step links the events and find how the states changes. 

The progresses in **Evaluation** and **Treatment** indicate increasing intensity. Higher **Evaluation** have higher capability to identify the disease of target; higher **Treatment** level are better in controlling the disease (usually higher uncertainty or more side-effects as well).   
To be noted that the states of **Related-illness** are not ordered. They only highlight the clinician's top consideration.    
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Subfields");
                fig.show_paths();
                fig.show_fitted_points();
                fig.hide_timeouts();
            });


        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-3: Aligning episodes')
            .text('Context', `
Before this step, we have learnt the dimensions of a pathway, and we are going to summarise them.   
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Episodes");
                fig.hide_exc();
                fig.hide_bands();
            });

        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-4: Finding cut points')
            .text('Context', `
Aligning the three dimensions, the blink periods without and active states will show up. These period indicate the cut points between episodes to episodes.  
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Episodes");
                fig.show_bands();
            });


        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-5: Removing noises')
            .text('Context', `
Then, episodes without any active **Evaluation** or **Treatment** can be removed. The rest episodes are waiting to be interpreted as patient pathways. 
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Episodes");
                fig.show_bands();
                fig.show_exc();
            });


        show.appendSlide()
            .text('Chapter', 'From dimensions to episodes')
            .text('Section', 'Step 2-6: Extracting an episode')
            .text('Context', `
Now, we focused on one of the episodes. 
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Pathways");
                fig.show_stages();
                fig.hide_timing();
                fig.hide_pathway();
                // fig.hide_statistics();
            });


        show.appendSlide()
            .text('Chapter', 'From episodes to pathways')
            .text('Section', 'Step 3-1: Identifying critical timings')
            .text('Context', `
Considering the three dimensions together, we firstly identify some important timings

- **Start** Initial care-seeing. The timing of first event in the episode.
- **Evaluation**. The first event with evaluation tools. 
- **Confirmation** or Treatment start. The disease confirmation in the IPPA is defined as the regular treatment start. The under-dose and empirical treatment are counted as an evaluation strategy. 
- **End** The last event of this episodes. If the episode is ended with an active **Evaluation**, the event will be seen as a check if the disease is well-controlled. If last event is **Treatment**, where it is lost to follow-up or treatment completion requires further definitions.      
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Pathways");
                fig.show_stages();
                fig.show_timing();
                fig.hide_pathway();
                // fig.hide_statistics();
            });


        show.appendSlide()
            .text('Chapter', 'From episodes to pathways')
            .text('Section', 'Step 3-2: Labelling stages')
            .text('Context', `
Linking all the information together, for each stage-change, the IPPA labels a stage concerning the states of the three dimensions, the events or stage before and after, and relative time to the critical timings. 

A patient pathway is finally constructed in this stage. 
`)
            .event("activate", function(figs) {
                const fig = focusOn(figs, "Pathways");
                fig.hide_stages();
                fig.hide_timing();
                fig.show_pathway();
                // fig.hide_statistics();
            });


        show.appendSlide()
            .text('Chapter', 'From episodes to pathways')
            .text('Section', 'Step 3-3: Summarising')
            .text('Context', `
To sum up, The IPPA construct a patient pathway by
1. starting with he care seeking records.
2. labelling the records by respective events.
3. grouping the events to dimensions of **Related illness**, **Evaluation**, and **Treatment** 
4. linking the events by **time-out** period
5. cutting off unnecessary events
6. identifying the stages

We can also used the information in the patient pathway construction to find the indices of interest.
E.g. System delay is the time difference between initial care-seeking and disease confirmation. 
    
`)
            .event("activate", function(figs) {
                spreadAll(figs);
                figs.Records.spread();

                figs.Subfields.hide_timeouts();
                figs.Subfields.show_paths();
                figs.Subfields.show_fitted_points();

                figs.Episodes.show_bands();
                figs.Episodes.show_exc();

                figs.Pathways.hide_stages();
                figs.Pathways.hide_timing();
                figs.Pathways.show_pathway();
                figs.Pathways.show_statistics();
            });


        show.start();

    });
