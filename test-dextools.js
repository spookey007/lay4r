const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function test() {
  try {
    // Create a cookie jar to store cookies
    const cookieJar = new CookieJar();
    
    // Wrap axios with cookie jar support
    const client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en,en-US;q=0.9',
        'cache-control': 'max-age=0',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1'
      },
      timeout: 10000
    }));

    console.log('Visiting DEXTools pair explorer page to establish session...');
    const pairPageResponse = await client.get(
      'https://www.dextools.io/app/en/solana/pair-explorer/eKPfcKJJoxTFdENotSx6MasTG2JpoofadZ9WggH1LEk?t=1757013586141',
      {
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500;
        }
      }
    );
    
    console.log('Pair page status:', pairPageResponse.status);
    
    // Get cookies from the jar
    const cookies = await cookieJar.getCookies('https://www.dextools.io');
    console.log('All cookies:', cookies.map(c => c.key + '=' + c.value).join('; '));
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now try to get the API data
    console.log('Making API request...');
    const apiResponse = await client.get(
      'https://www.dextools.io/shared/data/pair?address=eKPfcKJJoxTFdENotSx6MasTG2JpoofadZ9WggH1LEk&chain=solana&audit=true&locks=true',
      {
        headers: {
          'accept': 'application/json',
          'accept-language': 'en,en-US;q=0.9',
          'content-type': 'application/json',
          'referer': 'https://www.dextools.io/app/en/solana/pair-explorer/eKPfcKJJoxTFdENotSx6MasTG2JpoofadZ9WggH1LEk?t=1757013586141',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        },
        validateStatus: function (status) {
          return status < 500;
        }
      }
    );

    console.log('API response status:', apiResponse.status);
    if (apiResponse.status === 200) {
      console.log('Success! Data:', JSON.stringify(apiResponse.data, null, 2));
    } else {
      console.log('Error response:', apiResponse.statusText);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

test();