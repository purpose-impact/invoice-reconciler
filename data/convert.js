const fs = require('fs');
const path = require('path');
const markdownpdf = require('markdown-pdf');

// Create directories if they don't exist
const markdownDir = './markdown';
const pdfDir = './pdf';

if (!fs.existsSync(markdownDir)) {
    fs.mkdirSync(markdownDir);
    console.log('Created markdown directory');
}

if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
    console.log('Created pdf directory');
}

// Get all markdown files
const markdownFiles = fs.readdirSync(markdownDir)
    .filter(file => file.endsWith('.md'));

if (markdownFiles.length === 0) {
    console.log('No markdown files found in the markdown directory');
    process.exit(0);
}

// Convert each markdown file to PDF
markdownFiles.forEach(file => {
    const inputPath = path.join(markdownDir, file);
    const outputPath = path.join(pdfDir, file.replace('.md', '.pdf'));
    
    console.log(`Converting ${file} to PDF...`);
    
    markdownpdf()
        .from(inputPath)
        .to(outputPath, () => {
            console.log(`Successfully converted ${file} to PDF`);
        });
}); 
