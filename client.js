/*global List*/
(function() {


    [].forEach.call(document.querySelectorAll(".url-row"), function(row) {
        var button = row.querySelector(".delete");
        button.addEventListener("click", function(e) {
            e.preventDefault();
            var sha1 = button.dataset.sha1;
            button.parentNode.removeChild(button);
            var req = new XMLHttpRequest();

            req.onload = function(e) {
                if (e.target.status !== 200) {
                    console.log("Failed to delete", sha1, e);
                    alert("Bad response: " + e.target.status + " Check the console");
                    return;
                }
                row.className += " deleted";
            };

            req.open("DELETE", "/req/" + sha1, true);
            req.send();

        }, false);



    });

    new List("cached-reqs", {
        valueNames: [ "size", "url", "created", "timestamp", "sha1" ]
    });

}());


