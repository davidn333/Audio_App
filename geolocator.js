function geoData() {

    var lat;
    var long;

    if (navigator.geolocation) {
        var options = {
            timeout:100000000
        }

        navigator.geolocation.getCurrentPosition(showPosition,
            showError, options
        )
    }

    function showPosition(position) {

        lat = position.coords.latitude;
        long = position.coords.longitude;

        console.log("Position found!")
        console.log("Latitude: " + position.coords.latitude + 
        "<br>Longitude: " + position.coords.longitude)

        makeRequest(lat,long)
    }

    function showError(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.")
            break;
            case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.")
            break;
            case error.TIMEOUT:
            console.log("The request to get user location timed out.")
            break;
            case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.")
            break;
        }
    }


    function makeRequest(lat, long) {

        var req = new XMLHttpRequest();
        const token = "pk.892c982f855ec98eba475ddc17282887"
        req.addEventListener('load', response)


        req.open("GET", "https://eu1.locationiq.com/v1/reverse.php?key="+token+"&lat="+lat+"&lon="+long+"&format=xml")
        // format=json is also an option


        req.send()

        function response() {
            console.log(req)

            // XML Response
            const dp = new DOMParser()
            const document = dp.parseFromString(req.response, "text/xml")

            const city = document.getElementsByTagName("city")[0].innerHTML
            const countryCode = document.getElementsByTagName("country_code")[0].innerHTML

            // JSON Response
            // const city = JSON.parse(req.response)["address"]["city"]
            // const countryCode = JSON.parse(req.response)["address"]["country_code"]

            app.run('geoData',city,countryCode)

        }


    }
}
geoData()