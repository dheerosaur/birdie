/* 
 * $$ is document.getElementById
 */

function gbId(id) {
    return document.getElementById(id);
}

function cur_date(id) {
    var dt = new Date();
    return "at " + dt.toDateString();
}

jQuery(function () {
        
        var $tsub = $("#tweet_submit"), 
            $tmsg = $("#tweet_message"),
            $tcount = $("#char_count"),
            username = $("#username").text(),
            tw_div = $('<div class="tweet"></div>'),
            tw_a = $('<a class="username"></a>').text(username)
                    .attr("href", "/user/username"),
            tw_span1 = $('<span class="message"></span>'),
            tw_span2 = $('<span class="pub_time"></span>');

        /* 1. Disable tweet submit
         * 2. Update char_count on change and
         * 3. Enable submit button if text is entered 
         */
        $tsub.attr("disabled", "disabled");
        $tmsg.bind('change keyup mouseup',
            function () {
                var val = $tmsg.val();
                if (val == '') {
                    $tsub.attr("disabled", "disabled");
                    $tcount.text(140);
                }
                else {
                    $tsub.removeAttr("disabled");
                    $tcount.text(140 - val.length);
                }
            });

        /* Tweet Handler
         * Stops form submit and makes an AJAX post request
         */
        $("#tweet_form").submit(function (e) {
            var msg = $tmsg.val().replace(/\s+/g, ' ');
            if (msg == '' || msg == ' ') return false;

//            $tmsg.trigger('tweetstart');
            $.ajax({
                type: "POST",
                url: "/rpc", 
                data: { action: 'tweet', message: msg },
                success: function (data) {
 //                   $tmsg.trigger('tweetstop');
                    $("#tweets").prepend(
                        tw_div.append(tw_a)
                              .append(tw_span1.text(msg))
                              .append(tw_span2.text(cur_date()))
                        );
                }
            });
            return false;
        });

        $("follow_form").submit(function (e) {

            return false;
        });

//jQuery end
});
