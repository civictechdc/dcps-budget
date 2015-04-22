!function(){"use strict";var t,e,a,l="data/data.csv",n=2016,r={enrollment:"Enrollment-Based Funds",specialty:"Specialty Funds",perpupilmin:"Per-Pupil Funding Minimum Funds",stabilization:"Stabilization Funds",sped:"Special Education Funds",ell:"English Language Learner Funds",atrisk:"At-Risk Funds",income:"Federal Title and ASP/ECR Funds",other:"Non-General Education Funds"},s=d3.format(",.0f"),i=d3.format("04d");$(function(){d3.csv(l,function(t){var e={name:t.SCHOOLNAME,year:+t.YEAR,code:i(t.SCHOOLCODE),ward:""===t.WARD?null:t.WARD,level:""===t.LEVEL?null:t.LEVEL,fortyForty:t.FORTYFORTY,budget:{},enrollment:{}};return e.budget[t.YEAR]=[{category:"enrollment",value:+t.AMT_ENROLLMENT},{category:"specialty",value:+t.AMT_SPECIALTY},{category:"perpupilmin",value:+t.AMT_PPFM},{category:"stabilization",value:+t.AMT_STABILIZATION},{category:"sped",value:+t.AMT_SPED},{category:"ell",value:+t.AMT_ELL},{category:"atrisk",value:+t.AMT_ATRISK},{category:"income",value:+t.AMT_TITLE+ +t.AMT_ASPECR}],e.enrollment[t.YEAR]={total:""===t.TOTALENROLLMENT?null:+t.TOTALENROLLMENT,atRisk:""===t.ATRISKENROLLMENT?null:+t.ATRISKENROLLMENT,sped:""===t.SPEDENROLLMENT?null:+t.SPEDENROLLMENT,ell:""===t.ELLENROLLMENT?null:+t.ELLENROLLMENT,ece:""===t.ECEENROLLMENT?null:+t.ECEENROLLMENT},e},t.initialize)}),t={initialize:function(e){function a(){"Bars"===t.globals.view?$("#legend").removeClass("hidden"):$("#legend").addClass("hidden"),"gened"===t.globals.category?($("#legend .other").removeClass("hidden"),$("#legend .extra-category").addClass("hidden")):($("#legend .other").addClass("hidden"),$("#legend .extra-category").removeClass("hidden"))}t.globals={},$("#loading").fadeOut(),$("#main").fadeIn(),$("p.what a").click(function(){var t=$.attr(this,"href");return $("html, body").animate({scrollTop:$(t).offset().top},500),!1});var l=_.partition(_.reject(e,{level:"other"}),{year:n});t.data=l[0],_.each(l[1],function(e){var a=_.find(t.data,function(t){return t.code===e.code});a.budget[e.year]=e.budget[e.year],a.enrollment[e.year]=e.enrollment[e.year]}),t.filterData({}),t.setCategory("gened"),t.loadView("Bars"),$(window).resize(function(){t.view.resize()}),a(),$("#views").change(function(e){t.loadView($(e.target).attr("value")),a()}),$("#filters").change(function(){var e={};$("#filters input:checked").each(function(){var t=$(this),a=t.attr("value");a&&(e[t.attr("name")]=a)}),t.filterData(e)}),$("#categories").change(function(e){t.setCategory($(e.target).attr("value")),a()})},filterData:function(e){t.globals.filter=e;var a=_.matches(e);_.each(t.data,function(t){t.filtered=!_.isEmpty(e)&&!a(t)}),t.view&&t.view.refresh()},setCategory:function(e){t.globals.category=e;var a="gened"===e?["enrollment","specialty","perpupilmin","stabilization"]:"total"===e?["enrollment","specialty","perpupilmin","stabilization","sped","ell","atrisk","income"]:[e],l=function(t,e){return t+e.value};_.each(t.data,function(t){t.selected={},_.each(t.budget,function(e,n){var r,s;r=_.partition(e,function(t){return _.includes(a,t.category)}),s={},s.lines=r[0],s.total=_.reduce(s.lines,l,0),s.lines.push({category:"other",value:_.reduce(r[1],l,0)}),s.fullBudget=_.reduce(s.lines,l,0),t.selected[n]=s}),t.change=null,_.has(t.selected,n-1)&&(t.change=t.selected[n].total/t.enrollment[n].total/(t.selected[n-1].total/t.enrollment[n-1].total)-1),t.enrchange=null,_.has(t.selected,n-1)&&(t.enrchange=t.enrollment[n].total/t.enrollment[n-1].total-1)}),t.view&&t.view.refresh()},loadView:function(a){t.globals.view=a,$("#exhibit").empty(),$("#school-view").hide(),t.view=new e[a](t.data)}},window.app=t,e={},e.Bars=function(t){var e,l=this;this.$el=$("#exhibit"),this.data=_.sortBy(t,function(t){return-(t.selected[n].fullBudget/t.enrollment[n].total)}),this.table=d3.select("#exhibit").append("table").attr("class","bar-chart").attr("summary","Schools by the funding per student"),e=this.table.append("thead").append("tr"),e.append("th").attr("scope","col").attr("data-sort","name").text("School Name").append("span").attr("class","sort-arrow"),e.append("th").attr("scope","col").attr("data-sort","enrollment").attr("class","descending").text("2016 Enrollment").append("span").attr("class","sort-arrow"),e.append("th").attr("scope","col").attr("data-sort","budget").attr("class","selected descending").text("Funds per Student").append("span").attr("class","sort-arrow"),e.append("th").attr("scope","col").attr("data-sort","change").attr("class","descending").text("Change").append("span").attr("class","sort-arrow"),$("table.bar-chart th").click(function(){var t,e=$(this),a=e.data("sort");e.hasClass("selected")&&"name"!==a?e.toggleClass("descending"):($("table.bar-chart th").removeClass("selected"),e.addClass("selected")),t=e.hasClass("descending"),l.refresh(function(e){var l;switch(a){case"budget":l=e.selected[n].total/e.enrollment[n].total;break;case"enrollment":l=e.enrollment[n].total;break;default:l=e[a]}return t?-l:l})}),this.tbody=this.table.append("tbody"),this.removeSchoolViews=function(t){$(".bar-chart .school-view").slideUp({duration:t?0:400,complete:function(){$(this).parent().parent().remove()}})},this.sort=function(t){return-(t.selected[n].total/t.enrollment[n].total)},this.click=function(t){if(l.removeSchoolViews(),t.code&&t.code!==l.expandedRow){l.expandedRow=t.code;var e=$("<tr>").addClass("school-view-row"+($(this).hasClass("odd")?" odd":"")),n=$("<td>").attr("colspan",4).appendTo(e),r=$("#school-view").clone().removeAttr("id");a(d3.select(r[0]),t),r.find("button.close").click(function(){l.expandedRow=null,l.removeSchoolViews()}),r.appendTo(n),$(this).after(e),r.slideDown()}else l.expandedRow=null},this.refresh()},e.Bars.prototype.resize=function(){},e.Bars.prototype.refresh=function(t){this.removeSchoolViews(!0),this.sort=t||this.sort;var e=this.data[0],a=e.selected[n].fullBudget/e.enrollment[n].total,l=this.tbody.selectAll("tr.bar").data(_.sortBy(this.data,this.sort)),i=_.template('<td><%= name %></td><td class="<%= enrchange < 0 ? "negative" : "" %>"> <span class="amount"><%= enrollment[CURRENT_YEAR].total %></span> <%= " (" + (enrchange * 100).toFixed(1) + "%)" %></td><td><div class="wrapper"><div class="bar"><span class="year"><%= CURRENT_YEAR + ": " %></span><span class="label"><%= "$" + commasFormatter(selected[CURRENT_YEAR].total / enrollment[CURRENT_YEAR].total) %></span><% _.each(selected[CURRENT_YEAR].lines, function (line) { %><span class="rect <%= line.category %>" title="<%= prettyCategories[line.category] %>"style="width: <%= (line.value / enrollment[CURRENT_YEAR].total) / max * 100 %>%;"></span><% }); %></div><% if (selected[CURRENT_YEAR - 1]) { %><div class="bar previous-year"><span class="year"><%= CURRENT_YEAR - 1 + ": " %></span><span class="label"><%= "$" + commasFormatter(selected[CURRENT_YEAR - 1].total / enrollment[CURRENT_YEAR - 1].total) %></span><% _.each(selected[CURRENT_YEAR - 1].lines, function (line) { %><span class="rect <%= line.category %>" title="<%= prettyCategories[line.category] %>"style="width: <%= (line.value / enrollment[CURRENT_YEAR - 1].total) / max * 100 %>%;"></span><% }); %></div><% } %></div></td><td class="<%= change < 0 ? "negative" : "" %>"><%= change ? (change * 100).toFixed(1) + "%" : "NA" %></td>',{imports:{commasFormatter:s,CURRENT_YEAR:n,max:a,prettyCategories:r}}),o=0;l.enter().append("tr").on("click",this.click),l.attr("class",function(t){return"bar school-"+t.code}).html(function(t){return i(t)}),l.classed("filtered",function(t){return t.filtered}).classed("odd",function(t){return t.filtered||(o+=1),o%2===1}),l.exit().remove()},e.Lines=function(t){var e=this,l={es:"Elementary",ms:"Middle",hs:"High",campus:"Education Campus"};this.margin={top:6,right:2,bottom:38,left:42},this.data=d3.nest().key(function(t){return t.level}).entries(_.reject(t,function(t){return null===t.level||!_.has(t.budget,n)||!_.has(t.budget,n-1)})),this.data=_.sortBy(this.data,function(t){return _.indexOf(["es","ms","hs","campus"],t.key)}),this.$el=$("#exhibit"),this.y=d3.scale.linear(),this.multiples=d3.select("#exhibit").selectAll(".multiple").data(this.data).enter().append("div").attr("class",function(t){return"multiple "+t.key}),this.multiples.append("span").attr("class","title").text(function(t){return l[t.key]}),this.tooltipName=this.multiples.append("span").attr("class","tooltip-name"),this.svg=this.multiples.append("svg").attr("class","slopegraph chart"),this.g=this.svg.append("g").attr("transform","translate("+this.margin.left+","+this.margin.top+")"),this.fg=this.g.append("g"),this.bg=this.g.append("g"),this.tooltipsLayer=this.g.append("g").attr("class","tooltips"),this.interactionLayer=this.g.append("g"),this.mouseover=function(t){e.fg.select(".line.school-"+t.code).classed("highlighted",!0);var a=d3.select(this.parentNode.parentNode).select(".tooltips"),l=d3.select(this.parentNode.parentNode.parentNode.parentNode).select(".tooltip-name"),r=a.append("g").attr("class","label").attr("transform","translate(30,"+(t.y1-8)+")"),i=a.append("g").attr("class","label").attr("transform","translate("+(e.width-30)+","+(t.y2-8)+")");l.text(t.name),r.append("rect").attr("x",-27).attr("y",-13).attr("width",55).attr("height",17).attr("rx",3).attr("ry",3),r.append("text").text("$"+s(t.selected[n-1].total/t.enrollment[n-1].total)).attr("text-anchor","middle"),i.append("rect").attr("x",-28).attr("y",-13).attr("width",55).attr("height",17).attr("rx",3).attr("ry",3),i.append("text").text("$"+s(t.selected[n].total/t.enrollment[n].total)).attr("text-anchor","middle")},this.mouseout=function(t){e.fg.select(".line.school-"+t.code).classed("highlighted",!1),e.tooltipsLayer.selectAll(".label").remove(),e.tooltipName.text("")},this.click=function(t){a(d3.select("#school-view"),t),$("#school-view").slideDown(),$("#school-view button.close").click(function(){$("#school-view").slideUp()})},this.resize()},e.Lines.prototype.resize=function(){this.width=this.$el.children().first().width()-this.margin.left-this.margin.right,this.height=400-this.margin.top-this.margin.bottom,this.pageWidth=this.$el.width(),this.svg.attr("width",this.width+this.margin.left+this.margin.right).attr("height",this.height+this.margin.top+this.margin.bottom),this.y.range([this.height,0]),this.refresh()},e.Lines.prototype.refresh=function(){var t,e,a,l,r=_.reduce(_(this.data).values().pluck("values").flatten().value(),function(t,e){var a=Math.max(e.selected[n].total/e.enrollment[n].total,e.selected[n-1].total/e.enrollment[n-1].total);return a>t?2e3*Math.ceil(a/2e3):t},0),i=this;this.y.domain([0,r]),t=d3.svg.axis().scale(this.y).orient("left").tickSize(0).tickValues([0,r/2,r]).tickFormat(function(t){return"$"+s(t/1e3)+"K"}),e=d3.svg.axis().scale(this.y).orient("right").tickSize(0).tickFormat(""),this.bg.selectAll(".axis").remove(),this.bg.append("g").attr("class","axis").call(t).append("text").text(n-1).attr("class","year").attr("x",5).attr("y",15),this.bg.append("g").attr("class","axis").attr("transform","translate("+this.width+",0)").call(e).append("text").text(n).attr("class","year").attr("text-anchor","end").attr("x",-5).attr("y",15),this.bg.selectAll(".tick text").style("text-anchor","middle").attr("x",-(this.margin.left+this.margin.right)/2),a=this.fg.selectAll(".line").data(function(t){return t.values}),a.enter().append("line").attr("class",function(t){return"line school-"+t.code}).attr("x1",0).attr("x2",this.width),a.classed("filtered",function(t){return t.filtered}),a.transition().duration(400).attr("y1",function(t){return t.y1=i.y(t.selected[n-1].total/t.enrollment[n-1].total),t.y1}).attr("y2",function(t){return t.y2=i.y(t.selected[n].total/t.enrollment[n].total),t.y2}),l=this.interactionLayer.selectAll(".interaction-line").data(function(t){return _.reject(t.values,"filtered")}),l.enter().append("line").attr("class","interaction-line").attr("x1",0).attr("x2",this.width).on("mouseover",this.mouseover).on("mouseout",this.mouseout).on("click",this.click),l.attr("y1",function(t){return t.y1}).attr("y2",function(t){return t.y2}),l.exit().remove()},a=function(t,e){function a(t,e){t.selectAll("svg").remove();var a=t.append("svg").attr("width","70px").attr("height","70px").append("g");a.attr("transform","translate("+c+","+c+")").selectAll(".arc").data(d([0,1])).enter().append("path").attr("class","arc").attr("d",function(t){return this._current=t,h(t)}).data(d([e,1-e])).transition().duration(1e3*e).attrTween("d",function(t){var e=d3.interpolate(this._current,t);return function(t){return h(e(t))}}),a.append("text").attr("class","amount").attr("y",5).style("text-anchor","middle").text("0%").transition().duration(1e3*e).tween("text",function(){var t=function(t){return(e*t*100).toFixed(0)+"%"};return function(e){this.textContent=t(e)}})}var l=t.selectAll("ul.field.budgetlines"),i=t.selectAll("div.chart.current-year"),o=t.selectAll("div.chart.previous-year"),c=35,d=d3.layout.pie().sort(null),h=d3.svg.arc().innerRadius(c-8).outerRadius(c);t.selectAll(".field.schoolname").text(e.name),e.enrollment[n-1]?(t.selectAll(".field.previous-year.atriskcount").text(e.enrollment[n-1].atRisk),t.selectAll(".field.previous-year.enrollment").text(e.enrollment[n-1].total),a(o,e.enrollment[n-1].atRisk/e.enrollment[n-1].total)):(t.selectAll(".field.previous-year.atriskcount").text("0"),t.selectAll(".field.previous-year.enrollment").text("0"),o.selectAll("svg").remove()),t.selectAll(".field.current-year.atriskcount").text(e.enrollment[n].atRisk),t.selectAll(".field.current-year.enrollment").text(e.enrollment[n].total),a(i,e.enrollment[n].atRisk/e.enrollment[n].total),t.selectAll("a.learndc").attr("href","http://learndc.org/schoolprofiles/view?s="+e.code+"#overview"),l.selectAll("li").remove(),_.forEach({current:n,previous:n-1},function(a,l){var n=t.selectAll("ul.field.budgetlines."+l+"-year"),i=e.budget[a];_.each(i,function(t){n.append("li").html('<span class="amount">$'+s(t.value)+"</span> "+r[t.category])})})}}();