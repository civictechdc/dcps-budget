/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, _, d3*/

(function () {
    'use strict';

    var app,
        charts,

        DATA_PATH = 'data/data.csv',

        MAX = 1500000,

        commasFormatter = d3.format(",.0f");

    $(function () {
        d3.csv(DATA_PATH, function (d) {
            return {
                name: d.SCHOOLNAME,
                code: d.SCHOOLCODE,
                ward: d.WARD === '' ? null : d.WARD,
                enrollment: d.ENROLLMENT === '' ? null : +d.ENROLLMENT,
                atRiskCount: d.ATRISKCOUNT === '' ? null : +d.ATRISKCOUNT,
                atRiskFunds: d.ATRISKTOTAL === '' ? null : +d.ATRISKTOTAL
            };
        }, app.initialize);
    });

    app = {
        globals: {},

        initialize: function (data) {
            $('#loading').fadeOut();
            $('#main').fadeIn();

            app.data = _.filter(data, 'atRiskCount');
            app.filteredData = app.data;

            app.loadView('Bubbles');

            $(window).resize(function () { app.view.resize() });
        },

        loadView: function (view) {
            $('#exhibit').empty();
            app.view = new charts[view](app.filteredData);
        },

        refreshView: function () {
            app.view.refresh();
        }
    };

    charts = {};

    charts.Bubbles = function (data) {
        this.margin = {top: 20, right: 35, bottom: 30, left: 90};
        this.data = data;
        this.$el = $('#exhibit');

        this.x = d3.scale.linear().domain([0, 600]);
        this.y = d3.scale.linear().domain([0, MAX]);

        this.svg = d3.select('#exhibit').append('svg');
        this.g = this.svg.append('g')
            .attr("class", "bubble chart")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.bg = this.g.append('g');

        this.resize();
    };

    charts.Bubbles.prototype.resize = function () {
        var xAxis, yAxis,
            width = this.$el.width() - this.margin.left - this.margin.right,
            height = this.$el.height() - this.margin.top - this.margin.bottom;

        this.svg
            .attr("width", width + this.margin.left + this.margin.right)
            .attr("height", height + this.margin.top + this.margin.bottom);

        this.x.range([0, width]);
        this.y.range([height, 0]);

        xAxis = d3.svg.axis()
            .scale(this.x)
            .ticks(width > 800 ? 12 : 6)
            .tickSize(-height - 10)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(this.y)
            .tickValues([0, 250000, 500000, 750000, 1000000, 1250000, 1500000])
            .tickFormat(function (d) { return '$' + commasFormatter(d / 1000) + 'K'; })
            .tickSize(-width - 10)
            .orient("left");

        this.bg.selectAll('.axis').remove();
        this.bg.selectAll('.guide').remove();

        this.bg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height + 10) + ")")
            .call(xAxis)
            .append("text")
                .attr("class", "label")
                .attr("x", width - 6)
                .attr("y", -16)
                .style("text-anchor", "end")
                .text("# of At-Risk Students");

        this.bg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(-10,0)")
            .call(yAxis)
            .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("x", -6)
                .attr("y", 16)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Total At-Risk Funds");

        this.bg.append("line")
            .attr("class", "guide")
            .attr("x1", this.x(0))
            .attr("y1", this.y(0))
            .attr("x2", this.x(600))
            .attr("y2", this.y(1206375));

        this.refresh();
    };

    charts.Bubbles.prototype.refresh = function () {
        var bubbles,
            that = this;

        bubbles = this.g.selectAll('.bubble')
            .data(this.data);

        bubbles.enter().append('circle')
            .attr('class', 'bubble')
            .attr('r', 6);

        bubbles.attr('cx', function (d) { return that.x(d.atRiskCount); })
            .attr('cy', function (d) { return that.y(d.atRiskFunds > MAX ? MAX + 40000 : d.atRiskFunds); });

        bubbles.exit().remove();
    };

}());