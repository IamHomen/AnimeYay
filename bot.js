import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';

const port = process.env.PORT || 3000;
const botToken = '6114264487:AAGCh9kZ_81BSddgVJAvO_X-u1uMqy_33-4'; // Replace with your Telegram bot token


import {
    generateEncryptAjaxParameters,
    decryptEncryptAjaxResponse,
} from './helpers/extractors/goload.js';
import { USER_AGENT, renameKey } from './utils.js';

const BASE_URL = 'https://gogoanime.llc/';
const BASE_URL2 = 'https://gogoanime.llc/';
const ANN_BASE_URL = 'https://www.animenewsnetwork.com/weekly-ranking/';
const ajax_url = 'https://ajax.gogo-load.com/';
const anime_info_url = 'https://gogoanime.film/category/';
const anime_movies_path = '/anime-movies.html';
const popular_path = '/popular.html';
const new_season_path = '/new-season.html';
const search_path = '/search.html';
const filter_path = '/filter.html';
const popular_ongoing_url = `${ajax_url}ajax/page-recent-release-ongoing.html`;
const recent_release_url = `${ajax_url}ajax/page-recent-release.html`;
const list_episodes_url = `${ajax_url}ajax/load-list-episode`;
const seasons_url = 'https://gogoanime.film/sub-category/';

const Referer = 'https://gogoplay.io/';
const goload_stream_url = 'https://goload.pro/streaming.php';
export const DownloadReferer = 'https://goload.pro/';

const nan = 'https://m3u8-proxy-cors-sable.vercel.app/cors?url=';

const disqus_iframe = (episodeId) =>
    `https://disqus.com/embed/comments/?base=default&f=gogoanimetv&t_u=https%3A%2F%2Fgogoanime.vc%2F${episodeId}&s_o=default#version=cfefa856cbcd7efb87102e7242c9a829`;
const disqus_api = (threadId, page) =>
    `https://disqus.com/api/3.0/threads/listPostsThreaded?limit=100&thread=${threadId}&forum=gogoanimetv&order=popular&cursor=${page}:0:0&api_key=E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F`;
    `https://disqus.com/api/3.0/threads/listPostsThreaded?limit=100&thread=${threadId}&forum=gogoanimetv&order=popular&cursor=${page}:0:0&api_key=E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F`;
    `https://disqus.com/api/3.0/threads/listPostsThreaded?limit=100&thread=${threadId}&forum=gogoanimetv&order=popular&cursor=${page}:0:0&api_key=E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F`;


const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
    port: port,
};

const app = express();
const bot = new TelegramBot(botToken, { polling: true });

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json('Welcome to AnimeYay Bot!');
});

app.get('/search', async (req, res) => {
    try {
        const keyw = req.query.keyw;
        const page = req.query.page;

        const data = await scrapeSearch({ keyw: keyw, page: page });

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({
            status: 500,
            error: 'Internal Error',
            message: err,
        });
    }
});

const scrapeSearch = async ({ list = [], keyw, page = 1 }) => {

    try {
        const searchPage = await axios.get(
            `${BASE_URL + search_path}?keyword=${keyw}&page=${page}`
        );
        const $ = cheerio.load(searchPage.data);

        $('div.last_episodes > ul > li').each((i, el) => {
            list.push({
                animeId: $(el).find('p.name > a').attr('href').split('/')[2],
                animeTitle: $(el).find('p.name > a').attr('title'),
                animeUrl: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
                animeImg: $(el).find('div > a > img').attr('src'),
                status: $(el).find('p.released').text().trim(),
            });
        });

        return list;
    } catch (err) {
        console.log(err);
        return { error: err };
    }
};

/** SCRAPE MP4 START **/
app.get('/watch/:id', async(req, res) => {
    try {
        const id = req.params.id;

        const data = await scrapeMP4({ id: id });

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({
            status: 500,
            error: 'Internal Error',
            message: err,
        });
    }
});

const scrapeMP4 = async({ id }) => {

    let sources = [];

    let sources_bk = [];

    try {

        let epPage, server, $, serverUrl;

        if (id) {

            epPage = await axios.get(BASE_URL2 + id);

            $ = cheerio.load(epPage.data);

            server = $('#load_anime > div > div > iframe').attr('src');

            serverUrl = new URL(server);

        } else throw Error("Episode id not found")

        const goGoServerPage = await axios.get(serverUrl.href, {

            headers: { 'User-Agent': USER_AGENT },

        });

        const $$ = cheerio.load(goGoServerPage.data);

        const params = await generateEncryptAjaxParameters(

            $$,

            serverUrl.searchParams.get('id')

        );

        const fetchRes = await axios.get(

            `

        ${serverUrl.protocol}//${serverUrl.hostname}/encrypt-ajax.php?${params}`, {

                headers: {

                    'User-Agent': USER_AGENT,

                    'X-Requested-With': 'XMLHttpRequest',

                },

            }

        );

        const res = decryptEncryptAjaxResponse(fetchRes.data);

        if (!res.source) return { error: 'No sources found!! Try different source.' };

        res.source.forEach((source) => sources.push(source));

        res.source_bk.forEach((source) => sources_bk.push(source));

        return {

            Referer: serverUrl.href,

            sources: sources,

            sources_bk: sources_bk,

        };

    } catch (err) {

        return { error: err };

    }

};


/**SCRAPE MP4 END **/


app.get('/episodes/:id', async(req, res) => {
    try {
        const id = req.params.id;

        const data = await scrapeAnimeEpisodes({ id: id });

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({
            status: 500,
            error: 'Internal Error',
            message: err,
        });
    }
});

const scrapeAnimeEpisodes = async({ epList = [],  id }) => {
    try {

        const animePageTest = await axios.get(`https://gogoanime.gg/category/${id}`);

        const $ = cheerio.load(animePageTest.data);

        const ep_start = $('#episode_page > li').first().find('a').attr('ep_start');
        const ep_end = $('#episode_page > li').last().find('a').attr('ep_end');
        const movie_id = $('#movie_id').attr('value');
        const alias = $('#alias_anime').attr('value');

        const html = await axios.get(
            `${list_episodes_url}?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=${0}&alias=${alias}`
        );
        const $$ = cheerio.load(html.data);

        $$('#episode_related > li').each((i, el) => {
            epList.push({
                episodeId: $(el).find('a').attr('href').split('/')[1],
                episodeNum: $(el).find(`div.name`).text().replace('EP ', ''),
                episodeUrl: BASE_URL + $(el).find(`a`).attr('href').trim(),
            });
        });

        return epList;
    } catch (err) {
        console.log(err);
        return { error: err };
    }
};


app.use((req, res) => {
    res.status(404).json({
        status: 404,
        error: 'Not Found',
    });
});

app.listen(port, () => {
    console.log('Express server listening on port %d in %s mode', port, app.settings.env);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = '<b>Welcome to the AnimeYay bot!</b>\n Here is some guide to get you started.\n\n /search <b>Keyword</b> Search your favorite Anime By Title\n /episodes <b>AnimeId</b> Enter AnimeId to show list of episodes of that anime.\n /watch <b>episodeId</b> enter episodeId to show video url to watch.\n\n <b>Recommended Video Players to Use</b>\n 1. MXPlayer\n 2. VLC For Android';
  
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

bot.onText(/\/search (.+?) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const searchTerm = match[1];
    const page = match[2]; // Specify the desired page number
  

    
    try {
        const data = await scrapeSearch({ keyw: searchTerm, page: page });
  
        // Format the data into a readable message
        let message = 'Search Result:\n\n ';
        
        
        for (const anime of data) {
            message += `Title: <pre><b>${anime.animeTitle}</b></pre>\n`;
            message += `Status: ${anime.status}\n`;
            message += `ANIME ID: <pre><b>${anime.animeId}</b></pre>\n\n`;
        }
  
        if (data.length === 0) {
            message = 'No results found.';
        }
  
        bot.sendMessage(chatId, message, { parse_mode: 'HTML'

});
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'An error occurred while searching for anime.');
    }
});

/**bot.on('callback_query', (query) => {

  const chatId = query.message.chat.id;

  const data1= query.data;
let page = '';
    let searchTerm ='';
    const values = data1.split(':');



// Access the individual values

  const value1 = values[0];

  const value2 = values[1];
    
  // Handle different button callbacks

  switch (value1) {

    case '1':

      page = `${value1}`;
      searchTerm = `${value2}`;

      break;

    case '2':

      page = `${value1}`;

      searchTerm = `${value2}`;

      break;
     
    case '3':

      page = `${value1}`;
      searchTerm = `${value2}`;

      break;
    
    case '4':

      page = `${value1}`;
      searchTerm = `${value2}`;

      break;
          
    case '5':

      page = `${value1}`;

      searchTerm = `${value2}`;

      break;

    default:

      break;

  }

    const keyboard = {

    inline_keyboard: [

      [{ text: 'Page 1', callback_data: `1:${searchTerm}` }],

      [{ text: 'Page 2', callback_data: `2:${searchTerm}` }],

      

      [{ text: 'Page 3', callback_data: `3:${searchTerm}` }],

      [{ text: 'Page 4', callback_data: `4:${searchTerm}` }],

      

      [{ text: 'Page 5', callback_data: `5:${searchTerm}` }],

    ],

  };

    

    try {

        const data2 = await scrapeSearch({ keyw: searchTerm, page: page });

  

        // Format the data into a readable message

        let message = 'Search Result:\n\n ';

        

        

        for (const anime of data2) {

            message += `Title: <pre><b>${anime.animeTitle}</b></pre>\n`;

            message += `Status: ${anime.status}\n`;

            message += `ANIME ID: <pre><b>${anime.animeId}</b></pre>\n\n`;

        }

  

        if (data2.length === 0) {

            message = 'No results found.';

        }

  

        bot.sendMessage(chatId, message, {

  parse_mode: 'HTML',

  reply_markup: {

    inline_keyboard: [

      [{ text: 'Page 1', callback_data: `1:${searchTerm}` }],

      [{ text: 'Page 2', callback_data: `2:${searchTerm}` }],

       

      [{ text: 'Page 3', callback_data: `3:${searchTerm}` }],

      

      [{ text: 'Page 4', callback_data: `4:${searchTerm}` }],

        

      [{ text: 'Page 5', callback_data: `5:${searchTerm}` }],

    ],

  },
            });

    } catch (err) {

        console.error(err);

        bot.sendMessage(chatId, 'An error occurred while searching for anime.');

    }
  // Answer the button callback

  bot.answerCallbackQuery(query.id);

});**/

bot.onText(/\/episodes (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  try {
    const data = await scrapeAnimeEpisodes({ id: id });
    let message = 'Episode List:\n\n ';
        
        
        for (const anime of data) {
            message += `Episode Id: <pre><b>${anime.episodeId}</b></pre>\n`;
            message += `Episode: ${anime.episodeNum}\n\n`;
        }
  
        if (data.length === 0) {
            message = 'No results found.';
        }
  
        bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (err) {
    bot.sendMessage(chatId, 'Error: ' + err);
  }
});


bot.onText(/\/watch (.+)/, async (msg, match) => {

    const chatId = msg.chat.id;

    const episodeId = match[1];

    try {

        const data = await scrapeMP4({ id: episodeId });

        if (data.error) {

            bot.sendMessage(chatId, `An error occurred: ${data.error}`);

        } else {

            // Format the data into a readable message

            let message = 'MP4 Sources:\n\n';

            message += `Referer: ${data.Referer}\n`;

            message += '\n Sources:\n';

            for (const source of data.sources[0].file) {
            
                
             message += `${source}`;

            }

            message += '\n Backup Sources:\n';

            for (const source of data.sources_bk[0].file) {

                message += `${source}`;

            }
            message += `\n Proxy for Bypass Access Denied:\n ${nan}`;
            message += '\n\n <b>How to use Proxy?</b>\n Just combine Proxy Url first then sources url.\n\n Example:\n https://m3u8-proxy-cors-sable.vercel.app/cors?url=https://www019.vipanicdn.net/streamhls/f5db347daf6fb913be2ca2246601a935/ep.2.1677663806.m3u8';
            bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

        }

    } catch (err) {po

        console.error(err);

        bot.sendMessage(chatId, 'An error occurred while scraping MP4 sources.');

    }

});


bot.onText(/\/guide/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '*What this bot can do?*\n\n /guide <shows list of commands>\n /search <keyword><Search Anime Title>\n /episodes <Show List Of Episodes of given AnimeId>\n');
});
