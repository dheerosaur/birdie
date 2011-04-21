function cur_time(id) {
    var dt = new Date();
    return dt.toTimeString().substr(0,5) + dt.toDateString();
}

jQuery(function () {
    var page_username = $("#page_username").text(),
        curr_username = $("#curr_username").text(),
        $flash = $("#flash");

    var actions = {
        tweet: tweetAction,
        follow: function (e, $this) { 
                    return followAction(e, $this.find(".fbutton,.ufbutton"), true); 
                },
        register: function () { return true; },
        showitems: showItemsAction,
    };

    $("form").bind("submit", function (e) {
        var action = $(this).attr("action").substr(1);
        return actions[action](e, $(this));
    });

    $(".ajaxable").bind("click", function (e) {
        var action = $(this).attr("data-action");
        return actions[action](e, $(this));
    });

    if ( $("body").hasClass("curr_user_timeline") ){

        var $tsub = $("#tweet_submit"), 
            $tmsg = $("#tweet_message"),
            $tcount = $("#char_count");

        /* 1. Disable tweet submit and clear msg box
         * 2. Update char_count on change and
         * 3. Enable submit button if text is entered 
         */
        $tsub.attr("disabled", "disabled");
        $tmsg.val('');
        $tmsg.bind('keyup mouseup',
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
    } //curr_user_timeline specific code ends
        
    function tweetAction (e, $this) {
        var msg = $tmsg.val().replace(/\s+/g, ' ');
        if (msg == '' || msg == ' ') return false;

        $.ajax({
            type: "POST",
            url: "/rpc", 
            data: { method: 'tweet', message: msg },
            dataType: "json",
            success: function (jsondata) {
                  jsondata.message = msg;
                  jsondata.published = cur_time();
                  $("#tweet_tmpl").tmpl(jsondata).prependTo("#tweets");
                  $("#no_tweets").text(jsondata.no_tweets);
                  $tmsg.val('').focus().trigger('keydown');
                },
            failure: function (data) {
                  $flash.text("Something's gone wrong. Please try again");
                },
            });
        e.preventDefault()
    } //tweetAction ends

    function followAction (e, $button, is_main) {
        $.ajax({
            type: "POST", url: "/rpc", 
            data: { method: 'follow', username: page_username },
            dataType: "json",
            success: function (data) {
                    if ($button.hasClass("fbutton")) {
                        $button.val("Following")
                            .removeClass("fbutton").addClass("ufbutton");
                    } else {
                        $button.val("Follow")
                            .removeClass("ufbutton").addClass("fbutton");
                    }
                    $("#no_followers").text(data.no_followers);
                },
            failure: function (data) {
                  $flash.text("Something's gone wrong. Please try again");
                },
            });
        return false;
    } //followAction ends

    function showItemsAction (e, $this) {
        if (! curr_username) return true;
        var target_id = $this.attr("data-target-id"),
            $target_div = $("#" + target_id);

        $("#itemlists").children().fadeOut(200, function () {
                $target_div.show();
            });

        if (!$target_div.hasClass("loaded")) {
            $.ajax({
                url: "/rpc",
                data: { method: $this.attr("data-method"), username: page_username },
                dataType: "json",
                success: function (jsondata) {
                        var list = jsondata.items.map(function (item) {
                                        return '<li><a href="' + item.link + 
                                            '">' + item.name + '</a></li>';
                                    });
                        $target_div.html('<p></p><ul>' + list.join("\n") + '</ul>')
                                   .addClass("loaded");
                        setTimeout( function () { $target_div.removeClass("loaded"); },
                                    5000);
                    },
                failure: function () {
                        $flash.text("Something's gone wrong. Please try again");
                    },
                });
        }
        else {
            $target_div.find("p").text("Not too quick");
        }
        e.preventDefault();
    } //showlistAction ends

//jQuery ends
});
