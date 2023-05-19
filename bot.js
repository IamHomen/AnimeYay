import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';

const port = process.env.PORT || 3000;
const botToken = '5819280302:AAG_Yjb35C6YBXfmL8bExOhEktjY_pSidj4'; // Replace with your Telegram bot token

const BASE_URL = 'https://gogoanime.llc/';
const BASE_URL2 = 'https://gogoanime.tel/';
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

const disqus_iframe = (episodeId) =>
    `https://disqus.com/embed/comments/?base=default&f=gogoanimetv&t_u=https%3A%2F%2Fgogoanime.vc%2F${episodeId}&s_o=default#version=cfefa856cbcd7efb87102e7242c9a829`;
const disqus_api = (threadId, page) =>
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

app.get('/episodes/:id', async(req, res) => {
    try {
        const id = req.params.id;

        const data = await scrapeAnimeDetails({ id: id });

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({
            status: 500,
            error: 'Internal Error',
            message: err,
        });
    }
});

const scrapeAnimeDetails = async({ epList = [],  id }) => {
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
    const message = 'Welcome to the GogoAnime bot! How can I assist you?';
  
    bot.sendMessage(chatId, message);
});

bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const searchTerm = match[1];
    const page = 1; // Specify the desired page number
  
    try {
        const data = await scrapeSearch({ keyw: searchTerm, page: page });
  
        // Format the data into a readable message
        let message = '';
        
        
        for (const anime of data) {
            message += `Title: <b>${anime.animeTitle}</b>\n`;
            message += `Status: ${anime.status}\n`;
            message += `ANIME ID: <b>${anime.animeId}</b>\n\n`;
        }
  
        if (data.length === 0) {
            message = 'No results found.';
        }
  
        bot.sendMessage(chatId, message);
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'An error occurred while searching for anime.');
    }
});

bot.onText(/\/episodes (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  try {
    const data = await scrapeAnimeDetails({ id: id });
    let message = '';
        
        
        for (const anime of data) {
            message += `Episode Id: <b>${anime.episodeId}</b>\n`;
            message += `Episode Number: ${anime.episodeNum}\n\n`;
        }
  
        if (data.length === 0) {
            message = 'No results found.';
        }
  
        bot.sendMessage(chatId, message);
  } catch (err) {
    bot.sendMessage(chatId, 'Error: ' + err);
  }
});

bot.onText(/\/guide/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '<b>What this bot can do?</b>\n\n /guide <shows list of commands>\n /search <keyword><Search Anime Title>\n /episodes <Show List Of Episodes of given AnimeId>\n');
});
