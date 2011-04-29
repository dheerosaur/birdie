function cur_time(id) {
    var dt = new Date();
    var timepart = dt.toTimeString().substr(0, 5);
    var date_str = dt.toDateString();
    var date_part = date_str.substr(0,3) + ", " + date_str.substr(4, 6);
    return timepart + " - " + date_part;
}

function returnTrue(){
    return true;
}

jQuery(function () {
    var page_username = $("#page_username").text(),
        curr_username = $("#curr_username").text(),
        $flash = $("#flash"),
        $ajax_loader = $('<img class="ajax_loader">').attr("src", "/static/images/ajax-loader.gif");

    var actions = {
        tweet: tweetAction,
        follow: followAction,
        register: returnTrue,
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

    $(".ufbutton").val("Following");

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
                $tcount.removeClass("redtext");
                if (val == '') {
                    $tsub.attr("disabled", "disabled");
                    $tcount.text(140);
                }
                else {
                    $tsub.attr("disabled", false);
                    $tcount.text(140 - val.length);
                    if (val.length > 140) {
                        $tcount.addClass("redtext");
                        $tsub.attr("disabled", "disabled");
                    }
                }
            });
    } //curr_user_timeline specific code ends
        
    function tweetAction (e, $this) {
        var msg = $tmsg.val().replace(/\s+/g, ' ');
        if (msg == '' || msg == ' ' || msg.length > 140) return false;

        $this.append($ajax_loader.show());

        $.ajax({
            type: "POST",
            url: "/rpc", 
            data: { method: 'tweet', message: msg },
            dataType: "json",
            success: function (jsondata) {
                  jsondata.message = msg;
                  jsondata.published = cur_time();
                  $("#tweet_tmpl").tmpl(jsondata).hide().prependTo("#tweets").fadeIn(200);
                  $("#no_tweets").text(jsondata.no_tweets);
                  $tmsg.val('').focus().trigger('keydown');
                },
            failure: function (data) {
                  $flash.text("Something's gone wrong. Please try again");
                },
            complete: ajaxComplete,
            });
        e.preventDefault()
    } //tweetAction ends

    function followAction (e, $form) {
        var $button = $form.find(".fbutton,.ufbutton");
        $button.attr("disabled", "disabled");
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
            complete: function () {
                  $button.attr('disabled', false);
                },
            });
        return false;
    } //followAction ends

    function showItemsAction (e, $this) {
        var target_id = $this.attr("data-target-id"),
            $target_div = $("#" + target_id);

        $target_div.siblings().hide(0, function () {
                $target_div.fadeIn();
            });

        if (!$target_div.hasClass("loaded")) {
            $this.prepend($ajax_loader.show());
            $.ajax({
                url: "/rpc",
                data: { method: $this.attr("data-method"), username: page_username },
                dataType: "json",
                success: function (jsondata) {
                        var list = jsondata.items.map(function (item) {
                                        return '<div class="item"><a href="' + item.link + 
                                            '">' + item.name + '</a></div>';
                                    });
                        $target_div.html('<p></p>' + list.join("\n") )
                                   .addClass("loaded");
                        setTimeout( function () { $target_div.removeClass("loaded"); },
                                    5000);
                    },
                failure: function () {
                        $flash.text("Something's gone wrong. Please try again");
                    },
                complete: ajaxComplete,
                });
        }
        e.preventDefault();
    } //showlistAction ends

    function ajaxComplete() {
        $ajax_loader.hide();
    }
//jQuery ends
});
