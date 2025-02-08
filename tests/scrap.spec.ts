import { test, expect } from "@playwright/test";
import fs from "fs";

const PAGE = "https://www.amazon.in/";

const randomDelay = (time = 1000) =>
  Math.floor(Math.random() * (time - 1000 + 1)) + 1000;

interface Product {
  name: string;
  price: string;
  link: string;
}
const products: Product[] = [];

test("openPAAGE", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page).toHaveTitle(/Online Shopping site in India/);

  await page.waitForTimeout(randomDelay());

  await page.locator("#nav-link-accountList").hover();

  await page.waitForTimeout(randomDelay());

  await page.click('a[href*="signin"]');

  await page.waitForTimeout(randomDelay());

  const input = await page.getAttribute('input[type="email"]', "type");

  expect(input).toBeDefined();

  const email = process.env.email;
  if (!email) {
    throw new Error("Email is not defined in environment variables");
  }

  await page.fill("input[type='email']", email);

  await page.waitForTimeout(randomDelay());

  await page.click("input[type='submit']");

  await page.waitForTimeout(randomDelay());

  expect(
    await page.getAttribute("input[type='password']", "input")
  ).toBeDefined();

  const password = process.env.password;
  if (!password) {
    throw new Error("Password is not defined in environment variables");
  }
  await page.fill("input[type='password']", password);

  await page.waitForTimeout(randomDelay());

  await page.click('input[type="submit"]');

  await page.waitForTimeout(randomDelay());

  await page.click('a[href*="orders"]');

  await page.waitForTimeout(randomDelay());

  expect(await page.locator("h1:has-text('Your Orders')")).toBeDefined();

  let filterList = await get(page);

  filterList.click();

  await page.waitForSelector('ul[role="listbox"]', { state: "visible" });

  let list = await page.locator('ul[role="listbox"]');

  let listItems = await list.locator("> *");

  const count = await listItems.count();

  console.log(count, "count");

  for (let i = 0; i < count; i++) {
    if (products.length >= 10) {
      continue;
    }

    if (i > 0) {
      filterList = await get(page);
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

      expect(total).toBeDefined();

      await page.waitForSelector(".yohtmlc-product-title", {
        state: "visible",
        timeout: 5000
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
    }
  }

  const response = {
    products,
  };

  fs.writeFileSync("products.json", JSON.stringify(response));

  console.log(products);

  await page.waitForSelector("#nav-link-accountList", { state: "attached" });

  await page.locator("#nav-link-accountList").hover();

  await page.waitForTimeout(randomDelay());

  await page.locator("#nav-item-signout").click();
});

const get = async (page) => {
  await page.getByText("placed in").waitFor();
  const ordersText = await page.getByText("placed in");
  const filterList = await ordersText.locator("xpath=following-sibling::*[1]");
  return filterList;
};
