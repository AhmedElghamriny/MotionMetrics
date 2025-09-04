"""
Data preprocessing helper functions for movie/film datasets.

This module provides utilities for cleaning data, extracting features,
and encoding categorical variables for machine learning workflows.
"""

import ast
import pandas as pd
import nltk
import pickle
import numpy as np
import requests 
import os

# Download required NLTK data
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from collections import Counter
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity

TMDB_AUTH = os.getenv("TMDB_AUTH")
headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_AUTH}"
}


def drop_rows_with_non_values(df, column_name):
    """
    Drop entire rows where the specified column has non-values (NaN, None, empty strings).

    This function is useful for cleaning datasets where certain columns are critical
    and rows without valid values in those columns should be excluded from analysis.

    Args:
        df: The dataframe to clean
        column_name: The column name to check for non-values

    Returns:
        Cleaned dataframe with rows removed where the specified
        column contains NaN, None, or empty strings

    Example:
        >>> df = pd.DataFrame({'text': ['hello', '', None, 'world'], 'id': [1, 2, 3, 4]})
        >>> clean_df = drop_rows_with_non_values(df, 'text')
        Original rows: 4
        Rows after cleaning: 2
        Rows dropped: 2
    """
    # Create a copy to avoid modifying the original dataframe
    df_clean = df.copy()

    # Remove rows where the column is NaN or None
    df_clean = df_clean.dropna(subset=[column_name])
    
    # Remove rows where the column is an empty string
    df_clean = df_clean[df_clean[column_name] != ""]    

    # Print cleaning statistics for transparency
    print(f"Original rows: {len(df)}")
    print(f"Rows after cleaning: {len(df_clean)}")
    print(f"Rows dropped: {len(df) - len(df_clean)}")

    return df_clean


def extract_keywords(description):
    """
    Extract the top 3 most frequent keywords from a text description.

    Uses NLTK for tokenization and stopword removal to identify the most
    relevant keywords in a text description based on frequency.

    Args:
        description: The input description text.
                    Can be string, None, NaN, or empty string.

    Returns:
        A list of up to 3 keywords, sorted by frequency (most frequent first).
        Returns empty list for invalid/empty inputs.

    Example:
        >>> extract_keywords("The quick brown fox jumps over the lazy dog")
        ['quick', 'brown', 'fox']  # Actual output depends on stopwords filtering
    """
    # Handle edge cases: NaN, None, or empty values
    if pd.isna(description) or description is None or description == "":
        return []

    # Ensure input is a string (handles numeric inputs)
    description = str(description)

    # Step 1: Tokenize the text and convert to lowercase
    tokens = word_tokenize(description.lower())

    # Step 2: Remove English stopwords and keep only alphanumeric tokens
    stop_words = set(stopwords.words('english'))
    filtered_tokens = [word for word in tokens 
                      if word not in stop_words and word.isalnum()]

    # Step 3: Count word frequencies using dictionary
    word_counts = {}
    for word in filtered_tokens:
        word_counts[word] = word_counts.get(word, 0) + 1

    # Step 4: Sort words by frequency (highest first)
    sorted_keywords = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)

    # Step 5: Return only the top 3 keywords (words without counts)
    return [keyword for keyword, count in sorted_keywords[:3]]


def extract_feature_values(feature_string_json, key):
    """
    Extract values for a specific key from a JSON string containing a list of dictionaries.

    This function parses JSON strings that represent lists of dictionaries and extracts
    all values associated with a given key. Commonly used for extracting features like
    cast names, genres, or production companies from movie datasets.

    Args:
        feature_string_json: JSON string representation of a list
                            of dictionaries, or None/NaN
        key: The key to extract values for from each dictionary

    Returns:
        List of values found for the key across all dictionaries,
        or empty list if parsing fails or input is invalid

    Example:
        >>> json_str = '[{"name": "Actor1", "id": 1}, {"name": "Actor2", "id": 2}]'
        >>> extract_feature_values(json_str, "name")
        ['Actor1', 'Actor2']
    """
    # Handle edge cases more carefully
    if feature_string_json is None or feature_string_json == "" or str(feature_string_json).lower() == 'nan':
        return []

    values_list = []

    try:
        # Safely parse the JSON string into a Python object
        feature_json = ast.literal_eval(str(feature_string_json))
    except (ValueError, SyntaxError) as e:
        # Return empty list if JSON parsing fails (invalid format)
        return []

    # Ensure the parsed object is a list
    if not isinstance(feature_json, list):
        return []

    # Extract values for the specified key from each dictionary
    for element in feature_json:
        if isinstance(element, dict) and key in element:
            values_list.append(element[key])

    return values_list


def make_lower(lst):
    """
    Convert all elements in a list to lowercase.

    Simple utility function for normalizing string data to lowercase,
    commonly used before encoding or analysis.

    Args:
        lst: List of strings to convert to lowercase

    Returns:
        New list with all elements converted to lowercase

    Example:
        >>> make_lower(['ACTION', 'Comedy', 'DRAMA'])
        ['action', 'comedy', 'drama']
    """
    return [element.lower() for element in lst]


def filter_top_cast(df, column="cast", top_n=500, max_per_movie=5):
    """
    Filter cast data to keep only the most frequent cast members globally.

    This function reduces the dimensionality of cast data by:
    1. Identifying the most frequently appearing cast members across all movies
    2. Keeping only those top cast members
    3. Limiting the number of cast members per movie

    Args:
        df: DataFrame containing cast column with lists of cast IDs per row
        column: Column name containing cast IDs. Defaults to "cast"
        top_n: Keep only the top N most frequent cast IDs globally. 
               Defaults to 500
        max_per_movie: Maximum number of cast IDs to keep per movie. 
                      Defaults to 5

    Returns:
        Updated DataFrame with filtered cast column

    Example:
        >>> # Assuming df has a 'cast' column with lists of cast member IDs
        >>> filtered_df = filter_top_cast(df, column='cast', top_n=100, max_per_movie=3)
    """
    # Step 1: Flatten all cast IDs from all movies into a single list
    all_cast_ids = [cast_id for sublist in df[column] for cast_id in sublist]

    # Step 2: Count the frequency of each cast ID across all movies
    cast_counts = Counter(all_cast_ids)

    # Step 3: Get the top N most frequent cast IDs
    top_cast_ids = set([cast_id for cast_id, _ in cast_counts.most_common(top_n)])

    # Step 4: Filter each movie's cast list to include only top cast IDs
    # and limit to max_per_movie entries
    df[column] = df[column].apply(
        lambda ids: [cast_id for cast_id in ids if cast_id in top_cast_ids][:max_per_movie]
    )

    return df


def clean_language_codes(df, column_name):
    """
    Standardize language codes by mapping non-standard codes to ISO standard codes.

    This function normalizes language codes commonly found in movie datasets
    and removes rows with unknown/placeholder language codes.

    Mappings applied:
    - 'cn' -> 'zh' (Chinese)
    - 'mo' -> 'ro' (Moldovan -> Romanian)
    - 'sh' -> 'sr' (Serbo-Croatian -> Serbian)  
    - 'xx' -> None (Unknown/placeholder, row will be dropped)

    Args:
        df: The dataframe containing language codes
        column_name: Name of the column containing language codes to clean

    Returns:
        Dataframe with standardized language codes and unknown languages removed

    Example:
        >>> df = pd.DataFrame({'lang': ['en', 'cn', 'xx', 'fr']})
        >>> clean_df = clean_language_codes(df, 'lang')
        Original rows: 4
        Rows after cleaning: 3
        Rows dropped (unknown language): 1
    """
    # Define mapping from non-standard to standard language codes
    language_fixes = {
        'cn': 'zh',    # Chinese (non-standard -> ISO 639-1)
        'mo': 'ro',    # Moldovan -> Romanian (political/linguistic reasons)
        'sh': 'sr',    # Serbo-Croatian -> Serbian (historical language code)
        'xx': None     # Unknown/placeholder -> mark for removal
    }

    # Apply the language code mappings
    df[column_name] = df[column_name].replace(language_fixes)

    # Remove rows where language is None (originally 'xx' unknown codes)
    original_count = len(df)
    df = df.dropna(subset=[column_name])

    # Print cleaning statistics
    print(f"Original rows: {original_count}")
    print(f"Rows after cleaning: {len(df)}")
    print(f"Rows dropped (unknown language): {original_count - len(df)}")

    return df


def one_hot_encode_single_column(df, column_name):
    """
    Create one-hot encoded columns for a single categorical variable.

    This function creates binary (0/1) columns for each unique value in the specified
    column, useful for preparing categorical data for machine learning algorithms.

    Args:
        df: Input dataframe containing the categorical column
        column_name: Name of the column to one-hot encode

    Returns:
        Original dataframe with additional binary columns added.
        New columns are named as "{column_name}_{value}"

    Example:
        >>> df = pd.DataFrame({'genre': ['action', 'comedy', 'action']})
        >>> encoded_df = one_hot_encode_single_column(df, 'genre')
        # Results in columns: 'genre', 'genre_action', 'genre_comedy'
    """
    # Get all unique values in the column
    unique_values = df[column_name].unique()
    
    # Create a binary column for each unique value
    for value in unique_values:
        # Create column name by combining original column name with value
        new_column_name = f"{column_name}_{value}"
        # Create binary column: 1 if match, 0 if not
        df[new_column_name] = (df[column_name] == value).astype(int)
    
    return df


def encode_multi_label_column(df, column_name):
    """
    Create one-hot encoded columns for a multi-label categorical variable.

    This function handles columns where each row contains a list of categories
    (multi-label scenario) and creates binary columns for each possible label.
    Uses sklearn's MultiLabelBinarizer for efficient processing.

    Args:
        df: Input dataframe containing the multi-label column
        column_name: Name of the column containing lists of labels to encode

    Returns:
        New dataframe with binary columns for each label.
        Columns are named as "{column_name}_{label}".
        Original dataframe structure is preserved via index alignment.

    Example:
        >>> df = pd.DataFrame({'genres': [['action', 'comedy'], ['drama'], ['action', 'thriller']]})
        >>> encoded_df = encode_multi_label_column(df, 'genres')
        # Results in columns: 'genres_action', 'genres_comedy', 'genres_drama', 'genres_thriller'
    """
    # Initialize MultiLabelBinarizer for efficient one-hot encoding of lists
    mlb = MultiLabelBinarizer()
    
    # Fit and transform the multi-label data into binary matrix
    encoded = mlb.fit_transform(df[column_name])

    # Create descriptive column names by prefixing with original column name
    feature_names = [f"{column_name}_{label}" for label in mlb.classes_]

    # Create new dataframe with encoded features, preserving original index
    encoded_df = pd.DataFrame(encoded, columns=feature_names, index=df.index)

    return encoded_df

def extract_release_date(date):
  date_str = str(date)

  return date_str[: 4]

def separate_comma_entries(entry):
    """
    Separate comma-separated entries into a list.
    
    This function takes a string entry and splits it by commas into a list.
    If there's only one item (no commas), it still returns a list with that single item.
    Handles edge cases like NaN, None, and empty strings.
    
    Args:
        entry: The input entry to separate (can be string, None, NaN, or empty)
        
    Returns:
        List of separated items, with whitespace stripped from each item.
        Returns empty list for invalid/empty inputs.
        
    Example:
        >>> separate_comma_entries("apple, banana, orange")
        ['apple', 'banana', 'orange']
        
        >>> separate_comma_entries("single_item")
        ['single_item']
        
        >>> separate_comma_entries("")
        []
        
        >>> separate_comma_entries(None)
        []
    """
    import pandas as pd
    
    # Handle edge cases: NaN, None, or empty values
    if pd.isna(entry) or entry is None or entry == "":
        return []
    
    # Ensure input is a string
    entry = str(entry)
    
    # Split by comma and strip whitespace from each item
    items = [item.strip() for item in entry.split(',')]
    
    # Filter out any empty strings that might result from splitting
    items = [item for item in items if item != '']
    
    return items

def clean_and_validate_genres(df, content_type, genre_column='genres'):
    """
    Clean genre lists by keeping only valid genres. If any invalid genre is found 
    in a list, the entire list is set to empty.
    
    Args:
        df: pandas DataFrame containing the genre data
        genre_column: name of the column containing genre lists (default: 'genres')
    
    Returns:
        pandas DataFrame: DataFrame with cleaned genre column
    """
    # Valid genres from TMDB

    valid_genres = {}

    if content_type == "movie":
        valid_genres = {
            "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
            "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
            "Romance", "Science Fiction", "Thriller", "War", "Western", "TV Movie"
        }
    else:
        valid_genres = {
            "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary",
            "Drama", "Family", "Kids", "Mystery", "News", "Reality", "Sci-Fi & Fantasy",
            "Soap", "Talk", "War & Politics", "Western"
        }
        
    df_copy = df.copy()
    
    def validate_genre_list(genre_list):
        if not isinstance(genre_list, list):
            return []
        
        cleaned_genres = []
        all_valid = True
        
        for genre in genre_list:
            if isinstance(genre, str):
                cleaned_genre = genre.strip()
                if cleaned_genre in valid_genres:
                    cleaned_genres.append(cleaned_genre)
                else:
                    # Found invalid genre, mark entire list as invalid
                    all_valid = False
                    break
        
        # If any genre was invalid, return empty list
        if not all_valid:
            return []
        else:
            return cleaned_genres
    
    # Apply the validation function to the entire column
    df_copy[genre_column] = df_copy[genre_column].apply(validate_genre_list)
    
    return df_copy

def extract_unique_genres(df, genre_column='genres'):
    """
    Extract unique genre keywords from a DataFrame column containing lists of genres.
    
    Args:
        df: pandas DataFrame containing the genre data
        genre_column: name of the column containing genre lists (default: 'genres')
    
    Returns:
        list: sorted list of unique genre keywords
    """
    unique_genres = set()
    
    # Iterate through each row's genre list
    for genre_list in df[genre_column]:
        if isinstance(genre_list, list):  # Check if it's actually a list
            for genre in genre_list:
                if isinstance(genre, str):  # Make sure it's a string
                    # Clean and add each genre
                    cleaned_genre = genre.strip()
                    if cleaned_genre:  # Only add non-empty genres
                        unique_genres.add(cleaned_genre)
    
    # Return sorted list for consistent ordering
    return sorted(list(unique_genres))

def find_director_id(crew_data):
    """
    Find the ID of the first person with job "Director" in a crew array.
    
    This function searches through an array of dictionaries (typically crew data)
    and returns the ID of the first person whose job is exactly "Director".
    
    Args:
        crew_data: List of dictionaries or JSON string representation of crew data.
                  Each dictionary should contain 'job' and 'id' keys.
                  Can also be None, empty, or invalid data.
    
    Returns:
        int: The ID of the first director found, or None if no director is found
             or if the input is invalid.
    
    Example:
        >>> crew = [
        ...     {'job': 'Producer', 'id': 123, 'name': 'John Doe'},
        ...     {'job': 'Director', 'id': 456, 'name': 'Jane Smith'},
        ...     {'job': 'Director', 'id': 789, 'name': 'Bob Johnson'}
        ... ]
        >>> find_director_id(crew)
        456
    """
    # Handle edge cases
    if crew_data is None or crew_data == "" or str(crew_data).lower() == 'nan':
        return None
    
    # If input is a string (JSON), parse it
    if isinstance(crew_data, str):
        try:
            crew_data = ast.literal_eval(crew_data)
        except (ValueError, SyntaxError):
            return None
    
    # Ensure we have a list
    if not isinstance(crew_data, list):
        return None
    
    # Search for the first director
    for person in crew_data:
        if isinstance(person, dict) and person.get('job') == 'Director':
            return person.get('id')
    
    # Return None if no director found
    return None

import pickle
import pandas as pd

def filter_available_cast_directors(df, column_info_path):
    """
    Filter cast and director IDs to only include those that exist in the saved column info.
    
    Args:
        df: DataFrame with cast and director_id columns (containing lists of IDs)
        column_info_path: Path to the pickle file containing column information
    
    Returns:
        DataFrame with filtered cast and director_id columns
    """
    # Load the column info
    with open(column_info_path, 'rb') as f:
        column_info = pickle.load(f)
    
    # Extract available cast and director IDs from column names
    available_cast_ids = set()
    available_director_ids = set()
    
    # Parse cast column names to get IDs (assuming format: 'cast_12345')
    for col in column_info['cast_columns']:
        if col.startswith('cast_'):
            cast_id = col.replace('cast_', '')
            if cast_id.isdigit():
                available_cast_ids.add(int(cast_id))
    
    # Parse director column names to get IDs (assuming format: 'directors_67890')
    for col in column_info['directors_columns']:
        if col.startswith('directors_'):
            director_id = col.replace('directors_', '')
            if director_id.isdigit():
                available_director_ids.add(int(director_id))
    
    # Check what columns exist in your df
    cast_cols_in_df = [col for col in df.columns if 'cast' in col]
    director_cols_in_df = [col for col in df.columns if 'director' in col]

    # Create a copy of the dataframe
    df_filtered = df.copy()
    
    # Filter cast IDs (if they exist as list columns)
    if 'cast' in df_filtered.columns:
        def filter_cast(cast_list):
            if isinstance(cast_list, list):
                filtered = [cast_id for cast_id in cast_list if cast_id in available_cast_ids]
                return filtered
            else:
                return cast_list
        
        df_filtered['cast'] = df_filtered['cast'].apply(filter_cast)
    
    # Filter director IDs (if they exist as single value columns)
    if 'director_id' in df_filtered.columns:
        def filter_director(director_id):
            if pd.notna(director_id) and director_id in available_director_ids:
                return director_id
            else:
                return None
        
        df_filtered['director_id'] = df_filtered['director_id'].apply(filter_director)
    
    # If your df already has one-hot encoded columns, filter those instead
    if 'cast' not in df_filtered.columns and 'director_id' not in df_filtered.columns:
        
        # Filter cast columns
        available_cast_cols = {f'cast_{cast_id}' for cast_id in available_cast_ids}
        current_cast_cols = set(cast_cols_in_df)
        cols_to_remove = current_cast_cols - available_cast_cols
        
        df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
        
        # Filter director columns
        available_director_cols = {f'directors_{director_id}' for director_id in available_director_ids}
        current_director_cols = set(director_cols_in_df)
        cols_to_remove = current_director_cols - available_director_cols
        
        df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
    
    return df_filtered


def filter_available_keywords(df, column_info_path):
    """
    Filter title_keywords and overview_keywords to only include those that exist in the saved column info.
    
    Args:
        df: DataFrame with title_keywords and overview_keywords columns
        column_info_path: Path to the pickle file containing column information
    
    Returns:
        DataFrame with filtered keyword columns
    """
    # Load the column info
    with open(column_info_path, 'rb') as f:
        column_info = pickle.load(f)
    
    # Extract available keyword IDs from column names
    available_title_keywords = set()
    available_overview_keywords = set()
    
    # Parse title_keywords column names to get keywords (assuming format: 'title_keywords_word')
    for col in column_info['title_keywords_columns']:
        if col.startswith('title_keywords_'):
            keyword = col.replace('title_keywords_', '')
            available_title_keywords.add(keyword)
    
    # Parse overview_keywords column names to get keywords (assuming format: 'overview_keywords_word')
    for col in column_info['overview_keywords_columns']:
        if col.startswith('overview_keywords_'):
            keyword = col.replace('overview_keywords_', '')
            available_overview_keywords.add(keyword)
    
    # Check what columns exist in your df
    title_kw_cols_in_df = [col for col in df.columns if 'title_keywords' in col]
    overview_kw_cols_in_df = [col for col in df.columns if 'overview_keywords' in col]
    
    # Create a copy of the dataframe
    df_filtered = df.copy()
    
    # Filter title_keywords (if they exist as list columns)
    if 'title_keywords' in df_filtered.columns:
        def filter_title_keywords(keyword_list):
            if isinstance(keyword_list, list):
                filtered = [keyword for keyword in keyword_list if keyword in available_title_keywords]
                return filtered
            else:
                return keyword_list
        
        df_filtered['title_keywords'] = df_filtered['title_keywords'].apply(filter_title_keywords)
    
    # Filter overview_keywords (if they exist as list columns)
    if 'overview_keywords' in df_filtered.columns:
        def filter_overview_keywords(keyword_list):
            if isinstance(keyword_list, list):
                filtered = [keyword for keyword in keyword_list if keyword in available_overview_keywords]
                return filtered
            else:
                return keyword_list
        
        df_filtered['overview_keywords'] = df_filtered['overview_keywords'].apply(filter_overview_keywords)
    
    # If your df already has one-hot encoded columns, filter those instead
    if 'title_keywords' not in df_filtered.columns and 'overview_keywords' not in df_filtered.columns:
        
        # Filter title_keywords columns
        available_title_kw_cols = {f'title_keywords_{keyword}' for keyword in available_title_keywords}
        current_title_kw_cols = set(title_kw_cols_in_df)
        cols_to_remove = current_title_kw_cols - available_title_kw_cols
        
        df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
        
        # Filter overview_keywords columns
        available_overview_kw_cols = {f'overview_keywords_{keyword}' for keyword in available_overview_keywords}
        current_overview_kw_cols = set(overview_kw_cols_in_df)
        cols_to_remove = current_overview_kw_cols - available_overview_kw_cols

        df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
    
    return df_filtered

def add_missing_columns_and_reorder(df, column_info_path):
    """
    Add missing cast_, title_keywords_, and overview_keywords_ columns from the saved column info,
    set them to 0, and reorder the entire DataFrame to match the exact column order from training.
    
    Args:
        df: DataFrame with current columns
        column_info_path: Path to the pickle file containing column information
    
    Returns:
        DataFrame with all required columns added, set to 0 if missing, and in the exact same order as training
    """
    # Load the column info
    with open(column_info_path, 'rb') as f:
        column_info = pickle.load(f)
    
    # Get all required columns in the exact order from training
    all_required_columns = column_info['all_columns']
    
    # Get current columns in the DataFrame
    current_columns = set(df.columns)
    
    # Find missing columns
    missing_columns = []
    for col in all_required_columns:
        if col not in current_columns:
            missing_columns.append(col)
    
    
    # Create a DataFrame with missing columns set to 0 (more efficient approach)
    missing_df = pd.DataFrame(0, index=df.index, columns=missing_columns)
    
    # Concatenate original df with missing columns DataFrame
    df_complete = pd.concat([df, missing_df], axis=1)
    
    # Reorder columns to match the exact training order
    df_complete = df_complete.reindex(columns=all_required_columns, fill_value=0)
    
    return df_complete

def getAndProcessCredits(movie_id):
    credits_url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?language=en-US"
    response = requests.get(credits_url, headers=headers)
    response = response.json()

    df_credits = pd.DataFrame([response])
    df_credits.drop('id', axis=1, inplace=True)

    df_credits['cast'] = df_credits['cast'].apply(lambda x: extract_feature_values(x, 'id'))
    df_credits['directors'] = df_credits['crew'].apply(lambda x: find_director_id(x))
    df_credits.drop('crew', axis=1, inplace=True)

    df_credits = one_hot_encode_single_column(df_credits, 'directors')
    df_credits = pd.concat([df_credits, encode_multi_label_column(df_credits, 'cast')], axis=1)
    df_credits.drop(['cast', 'directors'], axis=1, inplace=True)

    return df_credits


def processMovieAPI(api_response):
    df = pd.DataFrame([api_response])

    cols_to_drop = ['adult', 'backdrop_path', 'poster_path', 'belongs_to_collection', 'budget', 'homepage', 'imdb_id', 'status', 'tagline', 'video', 'revenue', 'vote_count', 'original_title', 'spoken_languages', 'production_companies', 'runtime', 'origin_country']
    df.drop(cols_to_drop, axis=1, inplace=True)

    df['overview_keywords'] = df['overview'].apply(lambda x: extract_keywords(x))
    df['title_keywords'] = df['title'].apply(lambda x: extract_keywords(x))
    df.drop(['overview', 'title'], axis=1, inplace=True)

    df['genres'] = df['genres'].apply(lambda x: extract_feature_values(x, 'name'))
    df['production_countries'] = df['production_countries'].apply(lambda x: extract_feature_values(x, 'iso_3166_1'))

    df['production_countries'] = df['production_countries'].apply(make_lower)
    df['genres'] = df['genres'].apply(make_lower)
    df['overview_keywords'] = df['overview_keywords'].apply(make_lower)
    df['title_keywords'] = df['title_keywords'].apply(make_lower)

    df['release_date'] = df['release_date'].apply(lambda x: extract_release_date(x))
    df['popularity'] = pd.to_numeric(df['popularity'], errors='coerce')
    df['vote_average'] = pd.to_numeric(df['vote_average'], errors='coerce')

    df = one_hot_encode_single_column(df, 'original_language')
    df.drop('original_language', axis=1, inplace=True)

    df = pd.concat([df, encode_multi_label_column(df, 'genres')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'production_countries')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'title_keywords')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'overview_keywords')], axis=1)

    df.drop(['genres', 'title_keywords', 'overview_keywords', 'production_countries'], axis=1, inplace=True)

    df = filter_available_keywords(df, 'moviePickleFiles/movie_column_info.pkl')

    with open("moviePickleFiles/movie_sc_popularity.pkl", "rb") as f:
        sc_popularity = pickle.load(f)

    with open("moviePickleFiles/movie_sc_release_date.pkl", "rb") as f:
        sc_release_date = pickle.load(f)

    df['popularity'] = np.log1p(df['popularity'])
    df['popularity'] = np.log1p(df['popularity'])
    df['popularity'] = sc_popularity.transform(df[['popularity']])

    df['release_date'] = sc_release_date.transform(df[['release_date']])

    df['vote_average'] = df['vote_average']/10.0

    credits_df = getAndProcessCredits(df['id'][0])
    credits_df = filter_available_cast_directors(credits_df, 'moviePickleFiles/movie_column_info.pkl')
    df = pd.concat([df, credits_df], axis=1)

    df = add_missing_columns_and_reorder(df, 'moviePickleFiles/movie_column_info.pkl') 

    return df

def getSimilarMovies(api_response):
    with open("moviePickleFiles/movie_svd_model.pkl", "rb") as f:
        svd_model = pickle.load(f)

    with open("moviePickleFiles/movie_embeddings.pkl", "rb") as f:
        movie_embeddings = pickle.load(f)

    with open("moviePickleFiles/movie_ids.pkl", "rb") as f:
        movie_ids = pickle.load(f)

    query_df = processMovieAPI(api_response)
    
    # Get the current movie ID before dropping it
    current_movie_id = query_df['id'].iloc[0]
    
    query_df.drop('id', axis=1, inplace=True)
    query_df = query_df.astype('float32')

    query_embedding = svd_model.transform(query_df)

    similarities = cosine_similarity(query_embedding, movie_embeddings).flatten()

    sorted_indices = similarities.argsort()[::-1]
    seen_ids = set()
    unique_indices = []

    for idx in sorted_indices:
        movie_id = movie_ids.iloc[idx]
        
        # Skip the current movie ID and avoid duplicates
        if movie_id not in seen_ids and movie_id != current_movie_id:
            seen_ids.add(movie_id)
            unique_indices.append(idx)
            
        if len(unique_indices) >= 5:
            break

    return movie_ids.iloc[unique_indices].tolist()
    
def checkCreatedBy(df):
    if "created_by" not in df.columns:
        return df  # nothing to do if column doesn't exist

    col = df["created_by"]

    # Check if all values are empty lists, None, or empty strings
    if col.apply(lambda x: (isinstance(x, list) and len(x) == 0) or x in [None, ""]).all():
        df = df.drop(columns=["created_by"])
    else:
        # Extract first element if it's a non-empty list, and get the ID or name from dictionary
        def extract_created_by_value(x):
            if isinstance(x, list) and len(x) > 0:
                first_item = x[0]
                # If it's a dictionary, extract 'id' or 'name' field
                if isinstance(first_item, dict):
                    return first_item.get('id') or first_item.get('name')
                else:
                    return first_item
            elif x in [None, ""]:
                return None
            else:
                # If it's already a single dictionary, extract 'id' or 'name'
                if isinstance(x, dict):
                    return x.get('id') or x.get('name')
                else:
                    return x
        
        df["created_by"] = col.apply(extract_created_by_value)

    return df

def filter_available_additional_features(df, column_info_path):
    """
    Filter created_by, production_countries, and original_language to only include those that exist in the saved column info.
    
    Args:
        df: DataFrame with created_by, production_countries, and original_language columns
        column_info_path: Path to the pickle file containing column information
    
    Returns:
        DataFrame with filtered feature columns
    """
    # Load the column info
    with open(column_info_path, 'rb') as f:
        column_info = pickle.load(f)
    
    # Extract available values from column names
    available_created_by = set()
    available_production_countries = set()
    available_original_languages = set()
    
    # Parse created_by column names (assuming format: 'created_by_12345' or 'created_by_name')
    if 'created_by_columns' in column_info:
        for col in column_info['created_by_columns']:
            if col.startswith('created_by_'):
                value = col.replace('created_by_', '')
                # Handle both ID-based and name-based columns
                if value.isdigit():
                    available_created_by.add(int(value))
                else:
                    available_created_by.add(value)
    
    # Parse production_countries column names (assuming format: 'production_countries_US')
    if 'production_countries_columns' in column_info:
        for col in column_info['production_countries_columns']:
            if col.startswith('production_countries_'):
                country = col.replace('production_countries_', '')
                available_production_countries.add(country)
    
    # Parse original_language column names (assuming format: 'original_language_en')
    if 'original_language_columns' in column_info:
        for col in column_info['original_language_columns']:
            if col.startswith('original_language_'):
                language = col.replace('original_language_', '')
                available_original_languages.add(language)
    
    # Check what columns exist in your df
    created_by_cols_in_df = [col for col in df.columns if 'created_by' in col]
    production_countries_cols_in_df = [col for col in df.columns if 'production_countries' in col]
    original_language_cols_in_df = [col for col in df.columns if 'original_language' in col]

    # Create a copy of the dataframe
    df_filtered = df.copy()
    
    # Filter created_by (if they exist as list columns)
    if 'created_by' in df_filtered.columns:
        def filter_created_by(created_by_list):
            if isinstance(created_by_list, list):
                filtered = [item for item in created_by_list if item in available_created_by]
                return filtered
            else:
                return created_by_list
        
        df_filtered['created_by'] = df_filtered['created_by'].apply(filter_created_by)
    
    # Filter production_countries (if they exist as list columns)
    if 'production_countries' in df_filtered.columns:
        def filter_production_countries(countries_list):
            if isinstance(countries_list, list):
                filtered = [country for country in countries_list if country in available_production_countries]
                return filtered
            else:
                return countries_list
        
        df_filtered['production_countries'] = df_filtered['production_countries'].apply(filter_production_countries)
    
    # Filter original_language (if it exists as single value column)
    if 'original_language' in df_filtered.columns:
        def filter_original_language(language):
            if pd.notna(language) and language in available_original_languages:
                return language
            else:
                return None
        
        df_filtered['original_language'] = df_filtered['original_language'].apply(filter_original_language)
    
    # If your df already has one-hot encoded columns, filter those instead
    if ('created_by' not in df_filtered.columns and 
        'production_countries' not in df_filtered.columns and 
        'original_language' not in df_filtered.columns):
        
        # Filter created_by columns
        if available_created_by:
            available_created_by_cols = {f'created_by_{value}' for value in available_created_by}
            current_created_by_cols = set(created_by_cols_in_df)
            cols_to_remove = current_created_by_cols - available_created_by_cols
            
            df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
        
        # Filter production_countries columns
        if available_production_countries:
            available_production_countries_cols = {f'production_countries_{country}' for country in available_production_countries}
            current_production_countries_cols = set(production_countries_cols_in_df)
            cols_to_remove = current_production_countries_cols - available_production_countries_cols
            
            df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
        
        # Filter original_language columns
        if available_original_languages:
            available_original_language_cols = {f'original_language_{lang}' for lang in available_original_languages}
            current_original_language_cols = set(original_language_cols_in_df)
            cols_to_remove = current_original_language_cols - available_original_language_cols
            
            df_filtered = df_filtered.drop(columns=list(cols_to_remove), errors='ignore')
    
    return df_filtered

def processShowAPI(api_response):
    df = pd.DataFrame([api_response])

    cols_to_drop = ['vote_count', 'adult', 'backdrop_path', 'poster_path', 'last_air_date', 'homepage', 'in_production', 'original_name', 'status', 'tagline', 'networks', 'production_companies', 'episode_run_time', 'type', 'languages', 'spoken_languages', 'origin_country', 'seasons', 'next_episode_to_air', 'last_episode_to_air']
    df.drop(cols_to_drop, axis=1, inplace=True)

    df = checkCreatedBy(df)

    df['first_air_date'] = df['first_air_date'].apply(lambda x: extract_release_date(x))
    df['first_air_date'] = pd.to_numeric(df['first_air_date'], errors='coerce')

    df['overview_keywords'] = df['overview'].apply(lambda x: extract_keywords(x))
    df['title_keywords'] = df['name'].apply(lambda x: extract_keywords(x))

    df.drop(['overview', 'name'], axis=1, inplace=True)

    df['production_countries'] = df['production_countries'].apply(lambda x: extract_feature_values(x, 'name'))
    df['genres'] = df['genres'].apply(lambda x: extract_feature_values(x, 'name'))

    df['genres'] = df['genres'].apply(make_lower)
    df['overview_keywords'] = df['overview_keywords'].apply(make_lower)
    df['title_keywords'] = df['title_keywords'].apply(make_lower)
    df['production_countries'] = df['production_countries'].apply(make_lower)

    if 'original_language' in df.columns.to_list():
        df = one_hot_encode_single_column(df, 'original_language')
        df.drop(['original_language'], inplace=True, axis=1)

    if 'created_by' in df.columns.to_list():
        df = one_hot_encode_single_column(df, 'created_by')
        df.drop(['created_by'], inplace=True, axis=1)
    
    df = pd.concat([df, encode_multi_label_column(df, 'genres')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'production_countries')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'overview_keywords')], axis=1)
    df = pd.concat([df, encode_multi_label_column(df, 'title_keywords')], axis=1)
    df.drop(['genres', 'overview_keywords', 'production_countries', 'title_keywords'], axis=1, inplace=True)

    with open("showPickleFiles/show_sc_popularity.pkl", "rb") as f:
        sc_popularity = pickle.load(f)

    with open("showPickleFiles/show_sc_num_episodes.pkl", "rb") as f:
        sc_num_episodes = pickle.load(f)

    with open("showPickleFiles/show_sc_num_seasons.pkl", "rb") as f:
        sc_num_seasons = pickle.load(f)

    with open("showPickleFiles/show_sc_release_date.pkl", "rb") as f:
        sc_release_date = pickle.load(f)

    df['popularity'] = np.log1p(df['popularity'])
    df['popularity'] = np.log1p(df['popularity'])

    df['popularity'] = sc_popularity.transform(df[['popularity']])
    df['number_of_episodes'] = sc_num_episodes.transform(df[['number_of_episodes']])
    df['number_of_seasons'] = sc_num_seasons.transform(df[['number_of_seasons']])
    df['first_air_date'] = sc_release_date.transform(df[['first_air_date']])

    df['vote_average'] = df['vote_average']/10.0

    df = filter_available_keywords(df, 'showPickleFiles/show_column_info.pkl')
    df = filter_available_additional_features(df, 'showPickleFiles/show_column_info.pkl')
    df = add_missing_columns_and_reorder(df, 'showPickleFiles/show_column_info.pkl')

    return df

def getSimilarShows(api_response):
    with open("showPickleFiles/show_svd_model.pkl", "rb") as f:
        svd_model = pickle.load(f)

    with open("showPickleFiles/show_embeddings.pkl", "rb") as f:
        show_embeddings = pickle.load(f)

    with open("showPickleFiles/show_ids.pkl", "rb") as f:
        show_ids = pickle.load(f)

    query_df = processShowAPI(api_response)
    query_df.drop('id', axis=1, inplace=True)
    query_df = query_df.astype('float32')

    query_embedding = svd_model.transform(query_df)

    similarities = cosine_similarity(query_embedding, show_embeddings).flatten()

    sorted_indices = similarities.argsort()[::-1]
    seen_ids = set()
    unique_indices = []

    for idx in sorted_indices:
        show_id = show_ids.iloc[idx]
        
        if show_id not in seen_ids:
            seen_ids.add(show_id)
            unique_indices.append(idx)
            
        if len(unique_indices) >= 5:
            break

    return show_ids.iloc[unique_indices].tolist()