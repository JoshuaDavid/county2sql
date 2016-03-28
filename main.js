var map, markers, polygon, table, latCol, lngCol;

function ready() {
    var mapElement = document.getElementById('map');
    map = new google.maps.Map(mapElement);
    markers = [];

    map.setCenter({lat:34.5,lng:-118.4});
    map.setZoom(11);

    polygon = new google.maps.Polygon({
        paths:[],
        map: map,
    });

    google.maps.event.addListener(map, 'click', function(event) {
        var marker = new google.maps.Marker({
            position: event.latLng,
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
    });

    var tableInput = document.getElementById('table_name');
    var tableOutput = document.getElementById('table_output');
    var latColInput = document.getElementById('latitude_column');
    var lngColInput = document.getElementById('longitude_column');
    var condOutput = document.getElementById('condition');

    tableInput.onkeyup = render;
    latColInput.onkeyup = render;
    lngColInput.onkeyup = render;

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
                geomPts.push(parseFloat(point.lat) + ' ' + parseFloat(point.lng));
            }
            geomPts.push(parseFloat(points[0].lat) + ' ' + parseFloat(points[0].lng));
            var geometry = "GeomFromText('POLYGON((" + geomPts.join(", ") + "))')";
            var point = "PointFromText(concat('POINT(', " + latCol + ", ' ', " + lngCol + ", ')'))";
            var condition = 'contains(' + geometry + ', ' + point + ')';
        }
        condOutput.innerHTML = condition;
        tableOutput.innerHTML = table;
    }

    render();
}
