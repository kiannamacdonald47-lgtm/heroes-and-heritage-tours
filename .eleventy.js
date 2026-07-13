const markdownIt = require("markdown-it")({ html: false, breaks: false, linkify: true });

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("media");
  eleventyConfig.addPassthroughCopy("photos");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("CNAME");

  eleventyConfig.addFilter("currency", (value) => {
    return Number(value).toLocaleString("en-US");
  });

  eleventyConfig.addFilter("md", (value) => {
    return markdownIt.renderInline(value || "");
  });

  eleventyConfig.addFilter("initials", (name) => {
    return (name || "")
      .replace(/\(.*?\)/g, "")
      .split(/\s+/)
      .filter((w) => w && /^[A-Z]/.test(w))
      .map((w) => w[0])
      .slice(-2)
      .join("");
  });

  eleventyConfig.addFilter("relatedTours", (tours, currentSlug, count) => {
    return (tours || []).filter((t) => t.slug !== currentSlug).slice(0, count);
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
