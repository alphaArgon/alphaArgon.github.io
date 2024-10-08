---
title: 所有文章
---

<ul class="post-list">
{%- for post in site.posts -%}
    <li class="post-list-item">
        <a href="{{ post.url | relative_url }}">
            <figure class="post-list-item-content">
{%- if post.cover -%}
                <img class="post-list-cover" src="{{ post.cover | relative_url }}">
{%- endif -%}
                <figcaption class="post-list-caption">{{ post.title }}</figcaption>
                <p class="post-list-excerpt">{{ post.excerpt }}</p>
{%- if post.date -%}
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: {{ site.date_format }}</time>
{%- endif -%}
            </figure>
        </a>
    </li>
{%- endfor -%}
</ul>
