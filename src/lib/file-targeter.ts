/**
 * Analyzes an edit prompt to identify which files are most likely to need changes
 */

interface FileCategory {
  keywords: string[];
  filePatterns: RegExp[];
  priority: number; // Higher = more specific
}

const FILE_CATEGORIES: Record<string, FileCategory> = {
  styling: {
    keywords: [
      'color', 'style', 'css', 'tailwind', 'design', 'theme',
      'font', 'size', 'layout', 'spacing', 'margin', 'padding',
      'background', 'border', 'shadow', 'gradient', 'animation',
      'orange', 'blue', 'red', 'green', 'yellow', 'purple', 'pink'
    ],
    filePatterns: [
      /\.css$/,
      /\.scss$/,
      /tailwind\.config\.(js|ts)$/,
      /globals\.css$/,
      /styles?\.(ts|tsx|js|jsx)$/
    ],
    priority: 3
  },
  components: {
    keywords: [
      'component', 'button', 'input', 'form', 'modal', 'card',
      'header', 'footer', 'navbar', 'sidebar', 'menu', 'dropdown',
      'page', 'ui', 'interface', 'render', 'display', 'show'
    ],
    filePatterns: [
      /components\/.*\.(tsx|jsx)$/,
      /app\/.*page\.(tsx|jsx)$/,
      /src\/.*\.(tsx|jsx)$/
    ],
    priority: 2
  },
  api: {
    keywords: [
      'api', 'endpoint', 'route', 'server', 'backend',
      'fetch', 'request', 'response', 'data', 'database'
    ],
    filePatterns: [
      /api\/.*route\.(ts|js)$/,
      /\/api\/.*\.(ts|js)$/
    ],
    priority: 3
  },
  logic: {
    keywords: [
      'function', 'logic', 'algorithm', 'calculation',
      'util', 'helper', 'service', 'hook', 'state'
    ],
    filePatterns: [
      /lib\/.*\.(ts|js)$/,
      /utils\/.*\.(ts|js)$/,
      /hooks\/.*\.(ts|js)$/,
      /services\/.*\.(ts|js)$/
    ],
    priority: 2
  },
  config: {
    keywords: [
      'config', 'configuration', 'settings', 'environment',
      'env', 'setup', 'install', 'dependency', 'package'
    ],
    filePatterns: [
      /package\.json$/,
      /tsconfig\.json$/,
      /next\.config\.(js|ts)$/,
      /\.env$/,
      /.*\.config\.(js|ts)$/
    ],
    priority: 4
  }
};

/**
 * Analyzes the edit prompt and returns which file categories are relevant
 */
function analyzePrompt(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const relevantCategories: Array<{ category: string; score: number }> = [];

  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    let score = 0;

    // Check keyword matches
    for (const keyword of config.keywords) {
      if (lowerPrompt.includes(keyword)) {
        score += config.priority;
      }
    }

    if (score > 0) {
      relevantCategories.push({ category, score });
    }
  }

  // Sort by score (highest first) and return category names
  return relevantCategories
    .sort((a, b) => b.score - a.score)
    .map(item => item.category);
}

/**
 * Filters file list based on relevant categories
 */
function filterFilesByCategories(
  allFiles: string[],
  categories: string[]
): string[] {
  if (categories.length === 0) {
    // If no specific categories detected, return all source files
    return allFiles.filter(file =>
      file.match(/\.(tsx?|jsx?|css|scss)$/) &&
      !file.includes('node_modules') &&
      !file.includes('.next')
    );
  }

  const relevantFiles = new Set<string>();

  for (const category of categories) {
    const config = FILE_CATEGORIES[category];
    if (!config) continue;

    for (const file of allFiles) {
      for (const pattern of config.filePatterns) {
        if (pattern.test(file)) {
          relevantFiles.add(file);
        }
      }
    }
  }

  return Array.from(relevantFiles);
}

/**
 * Main function: identifies relevant files based on edit prompt
 */
export function identifyRelevantFiles(
  prompt: string,
  allFiles: string[]
): string[] {
  // Analyze prompt to get relevant categories
  const categories = analyzePrompt(prompt);

  if (categories.length > 0) {
    const categoryInfo = categories.map(cat => {
      const config = FILE_CATEGORIES[cat];
      const score = config ? config.priority : 0;
      return `${cat}(priority:${score})`;
    }).join(', ');
    console.log(`     → Categories: ${categoryInfo}`);
  } else {
    console.log(`     → No specific categories detected, using all source files`);
  }

  // Filter files based on categories
  const relevantFiles = filterFilesByCategories(allFiles, categories);

  // If too few files found, expand to all source files as fallback
  if (relevantFiles.length === 0) {
    console.log(`     → No matches, expanding to all source files`);
    return allFiles.filter(file =>
      file.match(/\.(tsx?|jsx?|css|scss)$/) &&
      !file.includes('node_modules') &&
      !file.includes('.next')
    );
  }

  // If too many files (>20), try to be more selective
  if (relevantFiles.length > 20) {
    console.log(`     → Too many files (${relevantFiles.length}), narrowing...`);
    // Prioritize by taking only the highest priority category
    if (categories.length > 0) {
      const topCategory = categories[0];
      const topCategoryFiles = filterFilesByCategories(allFiles, [topCategory]);
      if (topCategoryFiles.length > 0 && topCategoryFiles.length < relevantFiles.length) {
        console.log(`     → Narrowed to ${topCategoryFiles.length} using: ${topCategory}`);
        return topCategoryFiles;
      }
    }
  }

  return relevantFiles;
}

/**
 * Helper to check if a prompt requires specific file knowledge
 */
export function needsFileContext(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();

  // Keywords that suggest the user wants to edit existing code
  const editKeywords = [
    'change', 'update', 'modify', 'fix', 'edit', 'remove',
    'add', 'create', 'make', 'set', 'adjust', 'improve'
  ];

  return editKeywords.some(keyword => lowerPrompt.includes(keyword));
}
