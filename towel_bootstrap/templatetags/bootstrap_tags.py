from django import template
from django.conf import settings
from django.utils.formats import get_format

register = template.Library()

@register.simple_tag
def date_format():
    format = get_format('DATE_INPUT_FORMATS')[0]
    format = format.replace('%m', 'mm').replace('%d', 'dd').replace('%Y', 'yyyy')
    return format
