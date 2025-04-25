const fs = require('fs');
const path = require('path');

function splitMarkdownFile(inputFile, outputDir) {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read the input file
    const content = fs.readFileSync(inputFile, 'utf8');

    // Split content by page separator
    const pages = content.split('\n---\n');

    // Process each page
    pages.forEach((page, index) => {
        // Skip empty pages
        if (!page.trim()) {
            return;
        }

        // Extract title from the page content
        const titleMatch = page.match(/^#\s+(.+)$/m);
        let filename;
        
        if (titleMatch) {
            const title = titleMatch[1]
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            filename = `${String(index + 1).padStart(2, '0')}-${title}.md`;
        } else {
            filename = `${String(index + 1).padStart(2, '0')}-page.md`;
        }

        // Write the page to a new file
        const outputPath = path.join(outputDir, filename);
        fs.writeFileSync(outputPath, page.trim());
    });

    console.log(`Successfully split markdown file into individual files in ${outputDir}`);
}

// Main execution
const inputFile = 'markdown/supplier-contracts-invoices-additional.md';
const outputDir = 'markdown/split';
splitMarkdownFile(inputFile, outputDir); 
