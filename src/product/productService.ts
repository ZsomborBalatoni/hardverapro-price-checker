import axios from 'axios';
import * as cheerio from 'cheerio';
import { DBProduct } from '../database/databaseService';

export interface ScrapedProduct {
  name: string;
  dataUadId: string;
  price: number;
}

export async function getProductsFromSite(
  dbProducts: DBProduct[],
  highestDataUadIds: Record<string, number>
): Promise<ScrapedProduct[]> {
  const scrapedProducts: ScrapedProduct[] = [];

  for (const dbProduct of dbProducts) {
    try {
      const response = await axios.get(dbProduct.url);
      const $ = cheerio.load(response.data);
      let currentHighestDataUadId = highestDataUadIds[dbProduct.name] || 0;

      $('li[data-uadid]').each((index, element) => {
        const classAttr = $(element).attr('class') || '';
        if (!/^(media|media featured)$/.test(classAttr)) {
          return;
        }

        const dataUadId = $(element).attr('data-uadid');
        if (!dataUadId) {
          return;
        }

        const dataUadIdNumber = parseInt(dataUadId, 10);
        const priceText = $(element)
          .find('.uad-col.uad-col-price .uad-price .text-nowrap')
          .text()
          .replace(/\D/g, '');
        const price = parseInt(priceText, 10);

        if (
          dataUadIdNumber > currentHighestDataUadId &&
          price <= dbProduct.max_target_price &&
          price >= dbProduct.min_target_price
        ) {
          scrapedProducts.push({
            name: dbProduct.name,
            dataUadId,
            price,
          });
        }
      });
    } catch (error) {
      console.error(
        `Error while fetching data from ${dbProduct.name}'s url: ${dbProduct.url}:`,
        error
      );
    }
  }
  return scrapedProducts;
}
