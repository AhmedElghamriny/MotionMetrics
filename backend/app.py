import requests
import os
from flask import Flask, jsonify, request, send_from_directory, send_file
from urllib.parse import quote_plus
from helperFunctions import *
import random

app = Flask(__name__, static_folder='static', static_url_path='/')

POSTER_BASE_URL = "https://image.tmdb.org/t/p/original"

# All
ALL_TRENDING_URL = "https://api.themoviedb.org/3/trending/all/week?language=en-US"
Search = "https://api.themoviedb.org/3/search/multi?include_adult=false&language=en-US&page=1"

# Movies
MOVIE_NOW_PLAYING_URL = "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1"
MOVIE_TOP_RATED_URL = "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1"
MOVIE_UPCOMING_URL = "https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1"
MOVIE_TRENDING_URL = "https://api.themoviedb.org/3/trending/movie/day?language=en-US"

# TV Shows
TV_AIRING_TODAY_URL = "https://api.themoviedb.org/3/tv/airing_today?language=en-US&page=1"
TV_ON_THE_AIR_URL = "https://api.themoviedb.org/3/tv/on_the_air?language=en-US&page=1"
TV_TOP_RATED_URL = "https://api.themoviedb.org/3/tv/top_rated?language=en-US&page=1"
TV_TRENDING_URL = "https://api.themoviedb.org/3/trending/tv/week?language=en-US"

TMDB_AUTH = os.getenv("TMDB_AUTH")
headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_AUTH}"
}

# =======================================================================================
# ================================== UTILITY FUNCTIONS ==================================
# =======================================================================================

def encode_query_string(query):
    return quote_plus(query)

# =======================================================================================
# ======================================== ALL ==========================================
# =======================================================================================

@app.route("/data/all")
def all_trending():
    response = requests.get(ALL_TRENDING_URL, headers=headers)
    return response.json()

@app.route("/data/all/search/<query>")
def search_all(query):
    encoded_query = encode_query_string(query)
    response = requests.get(f"https://api.themoviedb.org/3/search/multi?query={encoded_query}&include_adult=false&language=en-US&page=1", headers=headers)
    return response.json()

# =======================================================================================
# ======================================= MOVIES ========================================
# =======================================================================================

@app.route("/data/movies/now_playing")
def movies_now_playing():
    response = requests.get(MOVIE_NOW_PLAYING_URL, headers=headers)
    return response.json()

@app.route("/data/movies/top_rated")
def movies_top_rated():
    response = requests.get(MOVIE_TOP_RATED_URL, headers=headers)
    return response.json()

@app.route("/data/movies/upcoming")
def movies_upcoming():
    response = requests.get(MOVIE_UPCOMING_URL, headers=headers)
    return response.json()

@app.route("/data/movies/trending")
def movies_trending():
    response = requests.get(MOVIE_TRENDING_URL, headers=headers)
    return response.json()

@app.route("/data/movies/search/<query>")
def movies_search(query):
    encoded_query = encode_query_string(query)
    response = requests.get(f"https://api.themoviedb.org/3/search/movie?query={encoded_query}&include_adult=false&language=en-US&page=1", headers=headers)
    return response.json()

@app.route("/data/movies/<movie_id>/credits")
def movie_credits(movie_id):
    movie_credits_url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?language=en-US"
    response = requests.get(movie_credits_url, headers=headers)
    return response.json()

@app.route("/data/movies/<movie_id>/details")
def movie_details(movie_id):
    movie_details_url = f"https://api.themoviedb.org/3/movie/{movie_id}?language=en-US"
    response = requests.get(movie_details_url, headers=headers)
    return response.json()

# NEW: Movie recommendations endpoint
@app.route("/data/movies/<movie_id>/recommendations")
def movie_recommendations(movie_id):
    """
    Get similar movies using our custom recommendation system
    Returns top 5 similar movies with their details
    """
    result = get_movie_details_with_recommendations(movie_id)
    if isinstance(result, tuple):  # Error case
        return jsonify(result[0]), result[1]
    return jsonify(result)

# =======================================================================================
# ====================================== TV SHOWS =======================================
# =======================================================================================

@app.route("/data/tv/airing_today")
def tv_airing_today():
    response = requests.get(TV_AIRING_TODAY_URL, headers=headers)
    return response.json()

@app.route("/data/tv/on_the_air")
def tv_on_the_air():
    response = requests.get(TV_ON_THE_AIR_URL, headers=headers)
    return response.json()

@app.route("/data/tv/top_rated")
def tv_top_rated():
    response = requests.get(TV_TOP_RATED_URL, headers=headers)
    return response.json()

@app.route("/data/tv/trending")
def tv_trending():
    response = requests.get(TV_TRENDING_URL, headers=headers)
    return response.json()

@app.route("/data/tv/search/<query>")
def tv_search(query):
    encoded_query = encode_query_string(query)
    response = requests.get(f"https://api.themoviedb.org/3/search/tv?query={encoded_query}&include_adult=false&language=en-US&page=1", headers=headers)
    return response.json()

@app.route("/data/tv/<tv_id>/credits")
def tv_credits(tv_id):
    tv_credits_url = f"https://api.themoviedb.org/3/tv/{tv_id}/credits?language=en-US"
    response = requests.get(tv_credits_url, headers=headers)
    return response.json()

@app.route("/data/tv/<tv_id>/details")
def tv_details(tv_id):
    tv_details_url = f"https://api.themoviedb.org/3/tv/{tv_id}?language=en-US"
    response = requests.get(tv_details_url, headers=headers)
    return response.json()

# =======================================================================================
# =================================== RECOMMENDATIONS ===================================
# =======================================================================================

@app.route('/api/movie-clicked', methods=['POST'])
def movie_clicked():
    """
    Handle movie click events and return recommendations
    """
    data = request.get_json()
    movie_id = data.get('movie_id')

    movie_details_url = f"https://api.themoviedb.org/3/movie/{movie_id}?language=en-US"
    response = requests.get(movie_details_url, headers=headers)

    print(f"Movie id: {movie_id}")
    print(f"Response: {response.json()}")

    similar_movies_list = getSimilarMovies(response.json())

    return jsonify({
        "status": "success", 
        "movie_id": movie_id,
        "recommendations": similar_movies_list
    })

@app.route('/api/show-clicked', methods=['POST'])
def show_clicked():
    """
    Handle show click events and return recommendations
    """
    data = request.get_json()
    show_id = data.get('show_id')

    show_details_url = f"https://api.themoviedb.org/3/tv/{show_id}?language=en-US"
    response = requests.get(show_details_url, headers=headers)

    print(f"Show id: {show_id}")
    print(f"Response: {response.json()}")

    similar_show_list = getSimilarShows(response.json())

    return jsonify({
        "status": "success", 
        "movie_id": show_id,
        "recommendations": similar_show_list
    })  

@app.route('/api/watchlist-recommendations', methods=['POST'])
def get_watchlist_recommendations():
    """
    Get recommendations based on a list of watchlist items
    Expects: {"watchlist": [{"id": "123", "type": "movie"}, {"id": "456", "type": "tv"}]}
    Returns: {"status": "success", "recommendations": [movie_ids, show_ids]}
    """
    data = request.get_json()
    watchlist_items = data.get('watchlist', [])
    
    if not watchlist_items:
        return jsonify({
            "status": "error",
            "message": "No watchlist items provided"
        })
    
    # Create a set of watchlist IDs for quick lookup
    watchlist_ids = {str(item.get('id')) for item in watchlist_items}
    
    all_recommendations = []
    
    for item in watchlist_items:
        content_id = item.get('id')
        content_type = item.get('type')

        print(content_id)
        print(content_type)
        
        try:
            if content_type == 'movie':
                # Get movie details and recommendations
                movie_details_url = f"https://api.themoviedb.org/3/movie/{content_id}?language=en-US"
                response = requests.get(movie_details_url, headers=headers)

                print('a')
                
                if response.ok:
                    movie_data = response.json()
                    similar_movies = getSimilarMovies(movie_data)
                    all_recommendations.extend(similar_movies)
                    
            elif content_type == 'tv':
                # Get TV show details and recommendations
                show_details_url = f"https://api.themoviedb.org/3/tv/{content_id}?language=en-US"
                response = requests.get(show_details_url, headers=headers)
                
                if response.ok:
                    show_data = response.json()
                    similar_shows = getSimilarShows(show_data)
                    all_recommendations.extend(similar_shows)
                    
        except Exception as e:
            print(f"Error processing {content_type} {content_id}: {str(e)}")
            continue
    
    # Remove duplicates
    unique_recommendations = list(set(all_recommendations))
    
    # Filter out items that are already in the watchlist
    filtered_recommendations = [
        rec_id for rec_id in unique_recommendations 
        if str(rec_id) not in watchlist_ids
    ]
    
    # Completely randomize the list
    random.shuffle(filtered_recommendations)
    
    # Limit to 20 recommendations
    limited_recommendations = filtered_recommendations[:20]

    print(f"Total recommendations before filtering: {len(unique_recommendations)}")
    print(f"Recommendations after filtering watchlist items: {len(filtered_recommendations)}")
    print(f"Final limited recommendations: {limited_recommendations}")
    
    return jsonify({
        "status": "success",
        "recommendations": limited_recommendations,
        "total_processed": len(watchlist_items),
        "total_recommendations": len(limited_recommendations)
    })

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
    
@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)