;
/* various plugins */
$.fn.flash = function() {
    return this.each(function() {
        var $this = $(this),
            opacity = $this.css('opacity');

        $this.css('opacity', 0.3).animate({opacity: opacity});
    });
};

$.fn.autogrow = function() {
    return this.not('.hasAutogrow').addClass('hasAutogrow').elastic();
};

/* gettext dummy
* if you need internationalizations, read here how to activate:
* https://docs.djangoproject.com/en/dev/topics/i18n/translation/#internationalization-in-javascript-code
* */
if (window.gettext === undefined) {
    window.gettext = function(msgid) {
        return msgid
    }
}


/* onReady */
(function($) {
    var onReady = window.onReady || [];
    for (var i=0, l=onReady.length; i<l; i++) onReady[i].apply(null, [$]);
})(jQuery);


/* init forms */
(function($) {
    if (!window.onForm) window.onForm = [];

    var onForm = window.onForm,
        initForms = function(elem) {
            var elem = $(elem || document);
            for (var i=0, len=onForm.length; i<len; ++i)
                onForm[i].apply(null, [elem, $]);
        };

    onForm.push(function(elem, $) {
        if ($.fn.chosen)
            elem.find('select').not('.plain').chosen();
        if ($.fn.datepicker) {
            elem.find('.date').each(function() {
                var self = $(this),
                    input = self.find('input');
                input.data('date-format', self.data('date-format'));
                input.datepicker();
            });
        }

        elem.find('textarea.autogrow').autogrow();
    });

    initForms();

    /* inject function into the global namespace */
    if (!window.initForms) window.initForms = initForms;

    $(document.body).on('updateLive', function(event, elem) {
        event.stopPropagation();
        elem.flash();
        initForms(elem);
    });
})(jQuery);


/* modals and ajaxmodal */
(function($) {
    var initModal = function() {
        var modal = this,
            $elem = $(this);

        $elem.find('form').each(function() {
            var $form = $(this),
                handleResponse = function(data) {
                    window.modalLoad.locked = false;

                    if (typeof(data) == 'string') {
                        $elem.html(data);
                        initModal.call($elem.get(0));
                    } else {
                        updateLive(data);
                        if (!('!keep' in data))
                            $elem.modal('hide');
                    }
                }

            // set modal to locked: navigating away will be prevented
            // and also closing the modal will prompt the user
            $form.filter('[method="post"]').on('change', function(event) {
                window.modalLoad.locked = true;
            });

            $form.on('submit', function() {
                if (this.method.toLowerCase() == 'post') {
                    if ($.fn.ajaxSubmit) {
                        // jquery.form.js is available, XHR file uploads will
                        // work too
                        var $bar = $elem.find('.progress-bar');

                        $(this).ajaxSubmit({
                            uploadProgress: function(evt, pos, total, percComplete) {
                                $bar.width(percComplete + '%');
                            },
                            beforeSubmit: function() {
                                $bar.width('0%');
                            },
                            success: handleResponse
                        });
                    } else {
                        $.post(this.action, $form.serialize(), handleResponse);
                    }
                } else {
                    $.get(this.action, $form.serialize(), handleResponse);
                }
                return false;
            });
        });
        setTimeout(function() {
            $elem.find('form').find('input:visible, textarea').first().focus();
            initForms();
        }, 100);
    },
    modalLoad = function(url) {
        var modal = $('#ajax-modal');

        if (!modal.length) {
            /* create div for holding AJAX-loaded modals, once */
            modal = $('<div id="ajax-modal" class="modal fade" />');
            modal.appendTo('body');
            modal.on('hide', function(event) {
                if (event.target != this) {
                    // another element triggered the hide event. Ignore it.
                    return true;
                }

                // if the modal is locked (i.e. uploading/submission in progress)
                if (window.modalLoad.locked) {
                    if (!confirm(gettext('You have unsaved changes. Do you really want to throw them away?'))) {
                        return false;
                    }
                }

                // unlock the modal
                window.modalLoad.locked = false;
                $('#logo').focus().blur();
            });
        }

        modal.empty().load(url, function() {
            initModal.call(this);
        }).modal();
    };

    $('body').on('click', 'a[data-toggle=ajaxmodal]', function(e) {
        modalLoad(this.href);
        return false;
    });

    // prevent navigating away without saving:
    $(window).on('beforeunload', function() {
        if (window.modalLoad.locked) {
          return gettext('You have unsaved changes. Do you really want to throw them away?')
        };
    });

    /* inject function into the global namespace */
    if (!window.modalLoad) window.modalLoad = modalLoad;
})(jQuery);


/* jQuery / Django CSRF handling
Thanks, https://docs.djangoproject.com/en/dev/ref/contrib/csrf/#ajax */
jQuery(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});
