import { createClient } from "@supabase/supabase-js";
import { Router } from "itty-router";
import { json, status, withContent } from "itty-router-extras";
import { readFrom, writeTo } from "./utils/cache";

const router = new Router();

router.get('/read-kv', async (request, { ARTICLES }) => {
	const articles = await readFrom(ARTICLES, "/articles");
	return json(articles);
})

router.get('/write-kv', async (request, { ARTICLES }) => {
	const articles = [{ title: "test4" }, { title: "test5" }];
	await writeTo(ARTICLES, "/articles", articles);
	return json(articles);
})


router.get('/articles', async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }) => {

	const cachedArticles = await readFrom(ARTICLES, "/articles");
	if (cachedArticles) {
		console.log("sending the cache");
		return  json(cachedArticles)
	}

	console.log("fetching fresh articles");

	const { data } = await supabase.from("Articles").select("*");
	await writeTo(ARTICLES, "/articles", data);
	return json(data)
});

router.get('/articles/:id', async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }) => {
	const { id } = request.params;
	const cachedArticles = await readFrom(ARTICLES, `/articles/${id}`);
	if (cachedArticles) {
		console.log("sending the cache");
		return json(cachedArticles)
	}

	console.log("fetching fresh articles");

	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	const { data } = await supabase
		.from("Articles")
		.select("*")
		.match({ id })
		.single();

	await writeTo(ARTICLES, `/articles/${id}`, data);

	return json(data);
})

router.post('/revalidate', withContent, async (request, { SUPABASE_URL, SUPABASE_ANON_KEY, ARTICLES }) => {
	const  { id } = request.content
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	const { data: article } = await supabase
		.from("Articles")
		.select("*")
		.match({ id })
		.single();
	
	await writeTo(ARTICLES, `/articles/${id}`, article);

	const { data: articles } = await supabase.from("articles").select("*");
	await writeTo(ARTICLES, "/articles", articles);
	return json({ received: true });
})

router.get("*", () => status(404, "Not Found"));

export default {
	fetch: router.handle
};