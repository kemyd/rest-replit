/* Packs by Shuffle 1.0.0 */
// Constants
const PORT = process.env.PORT || 3000;
const VIEWS_DIR = './bin/viewer/';
const HTML_DIR = './html/';
const STATIC_DIR = './static';
const VIEWER_STATIC_DIR = './bin/viewer/static/';

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob-promise');
const { exec } = require('child_process');
const platform = process.platform;

// Services & Utils
class FileUtils {
  static async readFile(filePath) {
    try {
      let clearFilePath = filePath;
      if (platform === 'win32') {
        clearFilePath = clearFilePath.replaceAll('\\', '/');
      };
      return await fs.readFile(clearFilePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  static async getFiles(pattern) {
    try {
      let clearPattern = pattern;
      if (platform === 'win32') {
          clearPattern = clearPattern.replaceAll('\\', '/');
      };
      return await glob(clearPattern);
    } catch (error) {
      throw new Error(`Failed to get files matching ${pattern}: ${error.message}`);
    }
  }

  static getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

class ComponentService {
  static async getComponentsByCategory() {
    const componentsByCategory = {};
    const files = await FileUtils.getFiles(path.join(HTML_DIR, '**', '*.html'));

    for (const file of files) {
      const category = path.basename(path.parse(file).dir);
      componentsByCategory[category] = componentsByCategory[category] || [];

      const content = await FileUtils.readFile(file);
      componentsByCategory[category].push({
        file: path.basename(file),
        content
      });
    }

    return componentsByCategory;
  }

  static async getCategoriesByType(type) {
    const categories = await FileUtils.getFiles(path.join(HTML_DIR, '*'));
    const filtered = categories
      .map(file => path.basename(file))
      .filter(category => !category.startsWith('__'));

    const categoryFilters = {
      top: category => category.match(/navigation|headers/),
      mid: category => !category.match(/navigation|header|footer|toast|alert|breadcrumb/),
      bottom: category => category.match(/footer/),
      default: () => false
    };

    return filtered.filter(categoryFilters[type] || categoryFilters.default);
  }

  static async getRandomComponent(category) {
    const files = await FileUtils.getFiles(path.join(HTML_DIR, category, '*.html'));
    const randomFile = FileUtils.getRandomElement(files.map(file => path.basename(file)));
    return randomFile;
  }

  static async getComponentHTML(category, component) {
    const componentId = path.parse(component).name;
    const htmlPath = path.join(HTML_DIR, category, component);
    const html = await FileUtils.readFile(htmlPath);

    return `
      <div data-component-id="${componentId}">
        ${html}
      </div>`;
  }
}

class PageController {
  static async renderIndex(req, res) {
    try {
      const componentsByCategory = await ComponentService.getComponentsByCategory();
      const categories = Object.keys(componentsByCategory);
      const currentCategory = req.query.category ?? categories[0];

      res.render('index.pug', {
        currentCategory,
        currentCategoryFormatted: currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1),
        components: componentsByCategory[currentCategory],
        categories,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async renderComponent(req, res) {
    try {
      const { id } = req.query;
      const component = await FileUtils.readFile(path.join(HTML_DIR, id));
      res.render('component.pug', { component });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async renderPage(req, res) {
    try {
      const { component, category } = req.query;
      const components = [];

      const [topCategories, midCategories, bottomCategories] = await Promise.all([
        ComponentService.getCategoriesByType('top'),
        ComponentService.getCategoriesByType('mid'),
        ComponentService.getCategoriesByType('bottom')
      ]);

      const categoryRegex = new RegExp(topCategories.join('|'));
      if (!category.match(categoryRegex)) {
        const randomCategory = FileUtils.getRandomElement(topCategories);
        const randomComponent = await ComponentService.getRandomComponent(randomCategory);
        components.push(await ComponentService.getComponentHTML(randomCategory, randomComponent));
      }

      if (category.match(new RegExp(bottomCategories.join('|')))) {
        const randomCategory = FileUtils.getRandomElement(midCategories);
        const randomComponent = await ComponentService.getRandomComponent(randomCategory);
        components.push(await ComponentService.getComponentHTML(randomCategory, randomComponent));
      }

      components.push(await ComponentService.getComponentHTML(category, component));

      if (!category.match(new RegExp(bottomCategories.join('|')))) {
        const randomMidCategory = FileUtils.getRandomElement(midCategories);
        const randomMidComponent = await ComponentService.getRandomComponent(randomMidCategory);
        components.push(await ComponentService.getComponentHTML(randomMidCategory, randomMidComponent));

        const randomBottomCategory = FileUtils.getRandomElement(bottomCategories);
        const randomBottomComponent = await ComponentService.getRandomComponent(randomBottomCategory);
        components.push(await ComponentService.getComponentHTML(randomBottomCategory, randomBottomComponent));
      }

      res.render('page.pug', { components });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
};

// App
const express = require('express');
const compression = require('compression');

const app = express();

// Middleware
app.set('views', VIEWS_DIR);
app.set('view engine', 'pug');
app.locals.pretty = true;

app.use(compression());
app.use(express.static(STATIC_DIR));
app.use(express.static(VIEWER_STATIC_DIR));
app.use(errorHandler);

// Routes
app.get('/', PageController.renderIndex);
app.get('/component', PageController.renderComponent);
app.get('/page', PageController.renderPage);

const openBrowser = (url) => {
  let command;

  // Windows
  if (platform === 'win32') {
    command = `start ${url}`;
  // macOS
  } else if (platform === 'darwin') {
    command = `open ${url}`;
  // Linux
  } else if (platform === 'linux') {
    command = `xdg-open ${url}`;
  }

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error('Failed to open the default browser:', error);
      }
    });
  }
}

// Start server
const startServer = () => {
  try {
    app.listen(PORT, () => console.info(`Server running on port ${PORT}`));
    openBrowser(`http://localhost:${PORT}/`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
