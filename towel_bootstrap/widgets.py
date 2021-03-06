from django import forms
from django.core.urlresolvers import reverse
from django.db.models import ObjectDoesNotExist
from django.db.models.fields import BLANK_CHOICE_DASH
from django.utils.safestring import mark_safe


_PICKER_TEMPLATE = u'''
<div class="input-group">
%(select)s
<a href="%(picker)s?field=%(field)s" class="input-group-addon picker"
    data-toggle="ajaxmodal"><i class="glyphicon glyphicon-search"></i>
</a>
</div>'''


class SelectWithPicker(forms.Select):
    def __init__(self, *args, **kwargs):
        self.model = kwargs.pop('model')
        self.request = kwargs.pop('request')
        super(SelectWithPicker, self).__init__(*args, **kwargs)

    def render(self, name, value, attrs=None, choices=()):
        choices = BLANK_CHOICE_DASH + [(item.id, unicode(item)) for item in
            self.model.objects.active_set(
                self.request.access,
                additional_ids=filter(None, [
                    value,
                    self.request.REQUEST.get(name),
                    ]),
                )]

        html = super(SelectWithPicker, self).render(name, value, attrs=attrs,
            choices=choices)

        opts = self.model._meta
        picker = reverse('%s_%s_picker' % (opts.app_label, opts.module_name))

        return mark_safe(_PICKER_TEMPLATE % {
            'select': html,
            'picker': picker,
            'field': attrs['id'],
            })


_AUTOCOMPLETION_TEMPLATE = u'''
%(hidden)s
<input type="text" id="%(id)s_typeahead" value="%(value_text)s"
    autocomplete="off">
<script>
onReady.push(function($) {
    var elem = $('#%(id)s'),
        searchingTimeout = null;

    $('#%(id)s_typeahead').typeahead({
        source: function (query, process) {
            if (!query) {
                if (searchingTimeout) {
                    clearTimeout(searchingTimeout);
                    searchingTimeout = null;
                }
                process([]);
            }

            searchingTimeout = setTimeout(function() {
                return $.getJSON('%(url)s', {q: query}, function(data) {
                    return process($.map(data.objects, function(item, idx) {
                        return item.__str__ + '{' + item.__pk__ + '}';
                    }));
                });
            }, 250);
        },
        matcher: function (item) { return true; },
        sorter: function(items) { return items; },
        updater: function(item) {
            var matches = item.match(/^(.*)\{(\d+)\}$/);
            if (matches) {
                elem.val(matches[2]);
                elem.trigger('change');
                return matches[1];
            }
            return item;
        },
        highlighter: function(item) {
            return item ? item.replace(/\{\d+\}$/, '') : '';
        }
    }).on('blur change', function() {
        if (!this.value)
            elem.val('');
    });
});
</script>
'''


class APIAutocompletionWidget(forms.TextInput):
    def __init__(self, *args, **kwargs):
        self.url = kwargs.pop('url')
        super(APIAutocompletionWidget, self).__init__(*args, **kwargs)

    def render(self, name, value, attrs=None):
        hidden = super(APIAutocompletionWidget, self).render(
            name, value, attrs=dict(attrs, type='hidden'))
        id_attr = attrs['id']
        value_text = ''

        if value:
            try:
                value_text = unicode(self.choices.queryset.get(pk=value))
            except (ObjectDoesNotExist, TypeError, ValueError):
                pass

        return mark_safe(_AUTOCOMPLETION_TEMPLATE % {
            'hidden': hidden,
            'id': id_attr,
            'url': self.url,
            'value_text': value_text,
            })
