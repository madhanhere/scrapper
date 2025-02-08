import { chromium, Page } from "playwright";
import fs from "fs";

const randomDelay = (time = 1000) =>
  Math.floor(Math.random() * (time - 1000 + 1)) + 1000;

interface Product {
  name: string;
  price: string;
  link: string;
}
const products: Product[] = [];

const PAGE = "https://amazon.in";

const getDropDown = async (page: Page) => {
  await page.getByText("placed in").waitFor();
  const ordersText = await page.getByText("placed in");
  const filterList = await ordersText.locator("xpath=following-sibling::*[1]");
  return filterList;
};

const login = async (page: Page) => {
  await page.goto("https://amazon.in");

  await page.waitForTimeout(randomDelay());

  await page.locator("#nav-link-accountList").hover();

  await page.waitForTimeout(randomDelay());

  await page.click('a[href*="signin"]');

  await page.waitForTimeout(randomDelay());

  const email = process.env.email;
  if (!email) {
    throw new Error("Email is not defined in environment variables");
  }

  await page.fill("input[type='email']", email);

  await page.waitForTimeout(randomDelay());

  await page.click("input[type='submit']");

  await page.waitForTimeout(randomDelay());

  const password = process.env.password;
  if (!password) {
    throw new Error("Password is not defined in environment variables");
  }
  await page.fill("input[type='password']", password);

  await page.waitForTimeout(randomDelay());

  await page.click('input[type="submit"]');
};

const goToOrders = async (page: Page) => {
  await page.click('a[href*="orders"]');

  await page.waitForTimeout(randomDelay());
};

const processProducts = async (page: Page) => {
  let filterList = await getDropDown(page);

  filterList.click();

  await page.waitForSelector('ul[role="listbox"]', { state: "visible" });

  let list = await page.locator('ul[role="listbox"]');

  let listItems = await list.locator("> *");

  const count = await listItems.count();

  for (let i = 0; i < count; i++) {
    if (products.length >= 10) {
      continue;
    }

    if (i > 0) {
      filterList = await getDropDown(page);
      filterList.click();
      await page.waitForSelector('ul[role="listbox"]', {
        state: "visible",
      });
    }

    list = await page.locator('ul[role="listbox"]');

    listItems = await list.locator("> *");

    listItems.nth(i).click();

    await page.waitForTimeout(1000);

    await page.waitForSelector(".order-card", { state: "attached" });

    const orderCards = await page.locator(".order-card");

    const orders = await orderCards.count();

    console.log("count", orders);

    for (let j = 0; j < orders; j++) {
      if (products.length > 10) continue;

      const order = orderCards.nth(j);

      await order.hover();

      const total =
        (await order.getByText("TOTAL")) || (await order.getByText("Total"));

      await page.waitForSelector(".yohtmlc-product-title", {
        state: "visible",
        timeout: 5000,
      });

      const productDetails = await order
        .locator(".yohtmlc-product-title")
        .first();

      let productName = "",
        url: string | null = "",
        price = "";

      const totalElement = await total.locator("..");

      const productEle = await totalElement.locator(
        "xpath=following-sibling::*[1]"
      );

      if (productDetails) {
        productName = await productDetails.innerText();

        const parent = await productDetails.locator("..");

        if (parent) {
          url = await parent.getAttribute("href");
          url = PAGE + url;
        }
      }

      if (productEle) {
        price = await productEle.innerText();
      }

      const productExists = products.some(
        (product) => product.name === productName
      );

      if (productExists) continue;

      const product = {
        name: productName,
        price,
        link: url ?? "",
      };
      products.push(product);
      console.log(product);
    }
  }
};

const saveToJSON = () => {
  const response = {
    products,
  };

  fs.writeFileSync("products.json", JSON.stringify(response));
};
(async () => {
  const browser = await chromium.launch({ headless: false }); // Launch browser
  try {
    const page = await browser.newPage();

    // 1. Login
    await login(page);

    await page.waitForTimeout(randomDelay());

    // 2. Orders
    await goToOrders(page);

    // 3. Products
    await processProducts(page);

    // 4. Save Products
    saveToJSON();

    //   console.log(products);

    // 5. Logout
    await page.waitForSelector("#nav-link-accountList", { state: "attached" });

    await page.locator("#nav-link-accountList").hover();

    await page.waitForTimeout(randomDelay());

    await page.locator("#nav-item-signout").click();
  } catch (err: any) {
    console.log(err.message);
  } finally {
    await browser.close();
  }
})();
