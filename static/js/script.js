function cur_time(id) {
    var dt = new Date();
    return "at " + dt.toDateString();
}

jQuery(function () {
    var page_username = $("#page_username").text(),
        curr_username = $("#curr_username").text(),
        $flash = $("#flash");

    var actions = {
        tweet: tweetAction,
        follow: function ($this) { 
                    return followAction($this.find(".fbutton,.ufbutton"), true); 
                },
        register: function () { return true; },
        showitems: showItemsAction,
    };

    $("form").bind("submit", function () {
        var action = $(this).attr("action").substr(1);
        return actions[action]($(this));
    });

    $(".ajaxable").bind("click", function () {
        var action = $(this).attr("data-action");
        return actions[action]($(this));
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
        
    if($("body").hasClass("user_timeline")) {
        var $fbutton = $("#follow_form").find(".fbutton");
            $unfbutton = $("#unfollow_form").find(".fbutton");

        /* 1. Change unfollow to following
         * 2. On hover, toggle unfollow
         * 3. On submit, call RPC follow or unfollow
        $unfbutton.text("Following")
                  .hover(function () { $(this).text("Unfollow"); },
                         function () { $(this).text("Following"); }
                       );
                       */
    } // user_timeline specific code ends


    function tweetAction () {
        var msg = $tmsg.val().replace(/\s+/g, ' ');
        if (msg == '' || msg == ' ') return false;

        $.ajax({
            type: "POST",
            url: "/rpc", 
            data: { method: 'tweet', message: msg },
            success: function (data) {
                  $("#tweets").prepend(
                      $(".tweet_clone:first").clone()
                            .find(".username").attr("href", "/user/"+curr_username)
                                              .text(curr_username).end()
                            .find(".message").text(msg).end()
                            .find(".pub_time").text(cur_time()).end()
                            .attr("class", "tweet")
                    );
                },
            failure: function (data) {
                  $flash.text("Something's gone wrong. Please try again");
                },
            });
        return false;
    } //tweetAction ends

    function followAction ($button, is_main) {
        $.ajax({
            type: "POST",
            url: "/rpc", 
            data: { method: 'follow', username: page_username },
            success: function (data) {
                    if ($button.hasClass("fbutton")) {
                        $button.val("Following")
                            .removeClass("fbutton").addClass("ufbutton");
                    } else {
                        $button.val("Follow")
                            .removeClass("ufbutton").addClass("fbutton");
                    }
                },
            failure: function (data) {
                  $flash.text("Something's gone wrong. Please try again");
                },
            });
        return false;
    } //followAction ends

    function showItemsAction ($this) {
        if (! curr_username) return true;

        var $target_div = $("#" + $this.attr("name"));
        $("#itemlists").children().fadeOut(100, function () {
                $target_div.fadeIn(100);
            });

        if (!$target_div.hasClass("loaded")) {
            $.ajax({
                url: "/rpc",
                data: { method: $this.attr("data-method"), username: page_username },
                dataType: "json",
                success: function (jsondata) {
                        var ul = ['<ul>'];
                        jsondata.items.map(function (item) {
                            ul.push('<li><a href="' + item.link +
                                      '">' + item.name + '</a></li>');
                        });
                        ul.push("</ul>");
                        $target_div.append(ul.join("\n"));
                        $target_div.addClass("loaded");
                    },
                failure: function () {
                        $flash.text("Something's gone wrong. Please try again");
                    },
                });
        }
        return false;
    } //showlistAction ends

    function update_count(counter, by) {
            
    }

//jQuery ends
});
