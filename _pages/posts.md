---
permalink: /posts
title: Posts
---

<ul class="post-list">
{%- for post in site.posts -%}
    <li class="post-list-item">
        <a href="{{ post.url | relative_url }}">
    {%- if post.cover -%}
            <figure class="post-entry has-image">
                <img class="post-entry-image" src="{{ post.cover | relative_url }}">
    {%- else -%}
            <figure class="post-entry">
    {%- endif -%}
                <figcaption class="post-entry-title">{{ post.title }}</figcaption>
                <small class="post-entry-excerpt">{{ post.excerpt }}</small>
    {%- if post.date -%}
                <div class="post-entry-meta">
                    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: site.date_format }}</time>
                </div>
    {%- endif -%}
            </figure>
        </a>
    </li>
{%- endfor -%}
</ul>
