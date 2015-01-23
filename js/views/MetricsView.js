var MetricsView = (function () {
    var template = [
        "<div class='header'>",
            "<h3 class='page-title'>{{title}}</h3>",
            "<p class='page-subtitle'>{{url}}</p>",
            "<a class='refresh-page' title='Measure again'><i class='mdi-navigation-refresh'></i></a>",
            "<a class='remove-page' title='Delete metrics'></i><i class='mdi-action-highlight-remove'></i></a>",
        "</div>",
        "<h1><i class='mdi-image-timer' title='Load time'></i> {{results.loadTime}}ms </h1>",
        "<div class='metrics-details'>",
            "<table>",
                "<tr>",
                    "<td>DNS query time</td>",
                    "<td>{{results.lookupDomainTime}}ms</td>",
                "</tr>",
                "<tr>",
                    "<td>TCP Connection time</td>",
                    "<td>{{results.connectTime}}ms</td>",
                "</tr>",
                "<tr>",
                    "<td>Request Time</td>",
                    "<td>{{results.requestTime}}ms</td>",
                "</tr>",
                "<tr>",
                    "<td>Init DOM Tree Time</td>",
                    "<td>{{results.initDomTreeTime}}ms</td>",
                "</tr>",
                "<tr>",
                    "<td>DOM Ready Time</td>",
                    "<td>{{results.domReadyTime}}ms</td>",
                "</tr>",
                "<tr>",
                    "<td>Time to first Paint</td>",
                    "<td>{{results.firstPaintTime}}ms</td>",
                "</tr>",


            "</table>",
        "</div>",
        "<div class='metrics-chart'></div>"
    ].join('\n');

    function MetricsView($el, $scope) {
        View.call(this, $el, $scope);

        this.bindUIEvents();

        this.updatePage();

        this.render();
    }

    MetricsView.prototype = Object.create(View.prototype);

    MetricsView.prototype.removePage = function() {
        _.remove(this.$scope.pages, function(page) {
            return page.url = this.$scope.page.url;
        }, this);

        chrome.storage.local.set({'pages': this.$scope.pages});
        this.$scope.page.record = [];

        this.$scope.changeView('default').then(function () {
            this.$scope.view.show();
        }.bind(this));
    };

    MetricsView.prototype.refreshPage = function() {
        chrome.tabs.getSelected(null, function(tab) {
            var code = 'window.location.reload();';
            chrome.tabs.executeScript(tab.id, {code: code});
        });
        window.close();
    };

    MetricsView.prototype.showTrend = function() {
        if (this.$scope.page.record.length < 2) {
            return false;
        }

        var current = this.$scope.page.results.loadTime;
        var prev = this.$scope.page.record[this.$scope.page.record.length - 2];
        var className = '';

        if (current > 1.05 * prev) {
            className = "mdi-action-trending-up";
        } else if (current <= 1.05 * prev && current >= 0.95 * prev) {
            className = "mdi-action-trending-neutral";
        } else {
            className = "mdi-action-trending-down";
        }

        this.$el.find('h1').append($('<i>').addClass(className));
    };

    MetricsView.prototype.updatePage = function() {
        _.forEach(this.$scope.pages, function(page) {
            if (page.url ===  this.$scope.page.url) {
                if (this.$scope.page.record.length >= 30) {
                    this.$scope.page.record.shift();
                }
                this.$scope.page.record.push(this.$scope.page.results.loadTime);
                page.record = this.$scope.page.record;
            }
        }, this);

        chrome.storage.local.set({'pages': this.$scope.pages});
    };

    MetricsView.prototype.bindUIEvents = function () {
        this.$el.one('click', '.refresh-page', this.refreshPage.bind(this));
        this.$el.one('click', '.remove-page', this.removePage.bind(this));
    };

    MetricsView.prototype.render = function () {
        var $scope = this.$scope;

        var chartData = _.clone($scope.page.record);
        var last = _.last($scope.page.record);
        chartData.pop();
        chartData.push({
            y: last,
            color: '#81d4fa'
        });

        this.$el.html(Mustache.to_html(template, $scope.page));
        this.showTrend();

        $('.metrics-chart').highcharts({
            title: {
                text: ''
            },
            xAxis: {
                categories: [''],
                title: {
                    text: null
                },
                labels: {
                    enabled:false,
                    y : 20,
                    rotation: -45,
                    align: 'right'
                }
            },
            yAxis: {
                title: {
                    text: ''
                },
                labels: {
                    enabled: false
                }
            },
            legend: {
                enabled: false
            },
            tooltip: {
                formatter: function() {
                    return this.y + 'ms';
                }
            },
            series: [{
                name: 'Load Time',
                data: chartData
            }]
        });

        $('.metrics-chart').height(165);
    };

    return MetricsView;
})();