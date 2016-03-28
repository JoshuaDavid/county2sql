var map, markers, polygon, table, latCol, lngCol, countiesByState = {}, counties = {};
var tableInput, tableOutput, latColInput, lngColInput, condOutput, clearButton;

function ready() {
    var mapElement = document.getElementById('map');
    map = new google.maps.Map(mapElement);
    markers = [];

    map.setCenter({lat:34.5,lng:-118.4});
    map.setZoom(8);

    polygon = new google.maps.Polygon({
        paths:[],
        map: map,
    });

    google.maps.event.addListener(map, 'click', function(event) {
        var position = event.latLng;
        addMarker(position);
    });

    tableInput = document.getElementById('table_name');
    tableOutput = document.getElementById('table_output');
    latColInput = document.getElementById('latitude_column');
    lngColInput = document.getElementById('longitude_column');
    condOutput = document.getElementById('condition');
    clearButton = document.getElementById('condition');

    tableInput.onkeyup = render;
    latColInput.onkeyup = render;
    lngColInput.onkeyup = render;
    clearButton.onclick = clear;


    loadCounties();
    render();
}

function addMarker(position) {
    var marker = new google.maps.Marker({
        position: position,
        map: map,
        draggable: true,
    });

    markers.push(marker);
    google.maps.event.addListener(marker, 'drag', function() {
        render();
    });

    google.maps.event.addListener(marker, 'dblclick', function() {
        var index = markers.indexOf(marker);
        markers.splice(index, 1);
        marker.setMap(null);
        render();
    });

    render();
}

function loadCounties() {
    var req = new XMLHttpRequest;
    req.open('GET', './us-counties/index.json');
    req.onreadystatechange = function() {
        if(req.readyState === 4 && req.status === 200) {
            var res = JSON.parse(req.responseText);
            countiesByState = res;
            setUpCountySelect();
        }
    }
    req.send();
}

function recomputeNames() {
    table = tableInput.value;
    latCol = table + '.' + latColInput.value;
    lngCol = table + '.' + lngColInput.value;
}

function render() {
    recomputeNames();
    var points = [];
    for(var i = 0, marker; marker = markers[i]; i++) {
        var position = marker.getPosition();
        points.push({
            lat: position.lat(),
            lng: position.lng(),
        });
    }

    polygon.setPaths(points);

    if(points.length < 3) {
        var condition = "1 = 0";
    } else {
        var geomPts = [];
        for(var i = 0, point; point = points[i]; i++) {
            geomPts.push(point.lat.toFixed(6) + ' ' + point.lng.toFixed(6));
        }
        geomPts.push(points[0].lat.toFixed(6) + ' ' + points[0].lng.toFixed(6));
        var geometry = "GeomFromText('POLYGON((\n    " + geomPts.join(",\n    ") + "\n  ))')";
        var point = "PointFromText(concat('POINT(', " + latCol + ", ' ', " + lngCol + ", ')'))";
        var condition = 'contains(' + geometry + ', ' + point + ')';
    }
    condOutput.innerHTML = condition;
    tableOutput.innerHTML = table;
}

function setUpCountySelect() {
    var states = [];

    // Fill <select>
    var select = document.getElementById('county');
    for(var state in countiesByState) {
        states.push(state);
    }
    states.sort();
    for(var i = 0, state; state = states[i]; i++) {
        var optGroup = document.createElement('optgroup');
        optGroup.setAttribute('label', state);
        var countiesInState = countiesByState[state];
        countiesInState.sort();
        for(var j = 0, county; county = countiesInState[j]; j++) {
            var option = document.createElement('option');
            option.setAttribute('value', county);
            option.innerHTML = county;
            optGroup.appendChild(option);
        }
        select.appendChild(optGroup);
    }

    // Set up counties
    for(var i = 0, state; state = states[i]; i++) {
        counties[state] = {};
        for(var j = 0, county; county = countiesInState[j]; j++) {
            counties[state][county] = null;
        }
    }

    select.onchange = function() {
        var option = select.selectedOptions[0];
        var county = option.value;
        var state = option.parentElement.label;
        chooseCounty(state, county);
    }
}

function loadCounty(stateName, countyName, callback) {
    var req = new XMLHttpRequest;
    req.open('GET', './us-counties/' + stateName + '/' + countyName + '.json');
    req.onreadystatechange = function() {
        if(req.readyState === 4 && req.status === 200) {
            var res = JSON.parse(req.responseText);
            counties[stateName][countyName] = res;
            callback(res);
        }
    }
    req.send();
}

function clear() {
    for(var i = 0, marker; marker = markers[i]; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    polygon.setPaths([]);
}

function chooseCounty(stateName, countyName) {
    loadCounty(stateName, countyName, function(county) {
        clear();

        // Get the points from the polygon / multipolygon
        points = [];
        if(county.geometry.type === "MultiPolygon") {
            var stack = [];
            for(var i = 0, polygon; polygon = county.geometry.coordinates[i]; i++) {
                for(var j = 0, latlng; latlng = polygon[0][j]; j++) {
                    var point = {
                        lat: latlng[1],
                        lng: latlng[0],
                    };
                    points.push(point);
                }
                stack.push(point);
            }
            while(stack.length > 0) {
                points.push(stack.pop());
            }
        } else {
            for(var j = 0, latlng; latlng = county.geometry.coordinates[0][j]; j++) {
                points.push({
                    lat: latlng[1],
                    lng: latlng[0],
                });
            }
        }

        // Show the markers
        for(var i = 0, point; point = points[i]; i++) {
            addMarker(point);
        }
    });
}

setTimeout(function() {
    var select = document.getElementById('county');
    select.value = 'Los Angeles';
    select.onchange();
}, 500);
