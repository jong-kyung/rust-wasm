use wasm_bindgen::prelude::*;
use pulldown_cmark::{Parser, html};

#[wasm_bindgen]
pub fn md_to_html(markdown: &str) -> String {
    let parser = Parser::new(markdown);
    let mut html_out = String::new();
    html::push_html(&mut html_out, parser);
    html_out
}
