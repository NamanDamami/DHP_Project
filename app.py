from flask import Flask, send_from_directory, jsonify
import pandas as pd

app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

# Load cleaned datasets
anime_df = pd.read_csv("cleaned_anime.csv")
movie_df = pd.read_csv("cleaned_imdb_movies.csv")
vg_df = pd.read_csv("cleaned_vgsales.csv")

# ANIME TRENDS
@app.route("/api/anime/episode_type_distribution")
def anime_episode_type_distribution():
    try:
        bins = [0, 12, 24, 50, 100, 200, 500, 10000]
        labels = ["<12", "12-24", "25-50", "51-100", "101-200", "201-500", ">500"]

        df = anime_df.dropna(subset=["Episodes", "Type"])
        df["Episodes"] = pd.to_numeric(df["Episodes"], errors="coerce")
        df = df.dropna(subset=["Episodes"])
        df["Episode Bin"] = pd.cut(df["Episodes"], bins=bins, labels=labels)

        # Count each Type per Episode Bin
        grouped = df.groupby(["Episode Bin", "Type"]).size().unstack(fill_value=0)

        # Get total titles per bin
        totals = grouped.sum(axis=1)

        # Prepare datasets for Chart.js
        datasets = []
        for col in grouped.columns:
            datasets.append({
                "label": col,
                "data": grouped[col].tolist(),
                "yAxisID": "left-y"
            })

        datasets.append({
            "label": "Total Titles",
            "data": totals.tolist(),
            "type": "line",
            "yAxisID": "right-y"
        })

        return jsonify({
            "bins": grouped.index.tolist(),
            "datasets": datasets
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/anime/top25_genre_ratings")
def anime_top25_genre_ratings():
    try:
        anime_clean = anime_df.dropna(subset=["Rating", "Genre"])
        anime_clean["Rating"] = anime_clean["Rating"].astype(float)

        # Rescale ratings if they appear to be on a 0–1 scale
        if anime_clean["Rating"].max() <= 1.0:
            anime_clean["Rating"] *= 10

        # Split genres, strip whitespace, and normalize case
        anime_clean["Genre"] = anime_clean["Genre"].apply(
            lambda g: [genre.strip().title() for genre in g.split(",")]
        )

        # Explode rows so each genre is on its own row
        expanded = anime_clean.explode("Genre")

        # Group by genre and calculate average rating and title count
        genre_stats = (
            expanded.groupby("Genre")
            .agg(avg_rating=("Rating", "mean"), count=("Title", "count"))
            .sort_values(by="avg_rating", ascending=False)
            .head(25)
            .reset_index()
        )

        return jsonify({
            "genres": genre_stats["Genre"].tolist(),
            "ratings": genre_stats["avg_rating"].round(2).tolist(),
            "counts": genre_stats["count"].tolist()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/anime/genre_type_distribution")
def anime_genre_type_distribution():
    try:
        # Drop rows with missing data
        df = anime_df.dropna(subset=["Genre", "Type"])

        # Normalize genres and explode into separate rows
        df["Genre"] = df["Genre"].apply(lambda x: [g.strip().title() for g in x.split(",")])
        df = df.explode("Genre")

        # Get top 25 genres by total count
        top_genres = (
            df["Genre"]
            .value_counts()
            .nlargest(25)
            .index
        )
        df = df[df["Genre"].isin(top_genres)]

        # Pivot data: counts of titles per Genre-Type combination
        grouped = df.groupby(["Genre", "Type"]).size().reset_index(name="Count")

        # Create structure for Chart.js datasets
        types = grouped["Type"].unique().tolist()
        genres = top_genres.tolist()

        # Total titles per genre (for right Y-axis)
        total_counts = grouped.groupby("Genre")["Count"].sum().reindex(genres).tolist()

        datasets = []
        for t in types:
            counts = []
            for g in genres:
                match = grouped[(grouped["Genre"] == g) & (grouped["Type"] == t)]
                count = int(match["Count"].values[0]) if not match.empty else 0
                counts.append(count)
            datasets.append({
                "label": t,
                "data": counts,
                "yAxisID": "left-y",
                "stack": "typeStack"
            })

        # Add total count line (right Y-axis)
        datasets.append({
            "label": "Total Titles",
            "data": total_counts,
            "type": "line",
            "borderColor": "black",
            "backgroundColor": "black",
            "yAxisID": "right-y",
            "fill": False
        })

        return jsonify({
            "genres": genres,
            "datasets": datasets
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# MOVIE TRENDS

# Genre Popularity Over Time Trend
def prepare_genre_trend_data(df):
    df = df.dropna(subset=["Genre", "IMDb", "Year"]).copy()

    # Convert Genre string to list if needed
    df["Genre"] = df["Genre"].apply(lambda x: x.split(",") if isinstance(x, str) else x)
    df = df.explode("Genre")

    # Convert Year to int
    df["Year"] = df["Year"].astype(int)

    # Group by Genre and Year
    trend = (
        df.groupby(["Genre", "Year"])
        .agg(count=("Title", "count"), avg_rating=("IMDb", "mean"))
        .reset_index()
    )

    # Get top 25 genres by total count
    top_genres = (
        trend.groupby("Genre")["count"]
        .sum()
        .nlargest(15)
        .index
    )

    filtered = trend[trend["Genre"].isin(top_genres)]

    # Format for frontend (one object per genre)
    result = {}
    for genre in top_genres:
        genre_df = filtered[filtered["Genre"] == genre]
        result[genre] = {
            "years": genre_df["Year"].tolist(),
            "counts": genre_df["count"].tolist(),
            "ratings": genre_df["avg_rating"].round(2).tolist()
        }
    return result

# Precompute the data once on app startup
genre_trend_cache = prepare_genre_trend_data(movie_df)

# Route that returns precomputed data
@app.route("/api/movie/genre-trend")
def movie_genre_trend():
    try:
        return jsonify(genre_trend_cache)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Average IMDb Rating per Genre
@app.route("/api/movie/genre_avg_rating")
def genre_avg_rating():
    try:
        df = movie_df.dropna(subset=["Genre", "IMDb"])
        df["IMDb"] = df["IMDb"].astype(float)
        df["Genre"] = df["Genre"].str.split(", ")
        df = df.explode("Genre")

        genre_stats = df.groupby("Genre").agg(
            count=("IMDb", "count"),
            avg_rating=("IMDb", "mean")
        )

        # Take top 25 genres by count (or by avg_rating if preferred)
        top_25 = genre_stats.sort_values(by="count", ascending=False).head(25)

        return jsonify({
            "genres": top_25.index.tolist(),
            "counts": top_25["count"].tolist(),
            "ratings": top_25["avg_rating"].tolist()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Movies by Year
@app.route("/api/movie/year_distribution")
def movie_year_distribution():
    try:
        counts = movie_df["Year"].dropna().astype(int).value_counts().sort_index()
        return jsonify({"labels": counts.index.tolist(), "data": counts.values.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GAME TRENDS
@app.route("/api/game/platform_sales_trend")
def game_platform_sales_trend():
    try:
        # Ensure Year column is integer (some may be floats or NaN)
        vg_df_cleaned = vg_df.dropna(subset=["Year", "Platform", "Global_Sales"])
        vg_df_cleaned["Year"] = vg_df_cleaned["Year"].astype(int)

        # Step 1: Identify top 25 platforms by total global sales
        top_platforms = (
            vg_df_cleaned.groupby("Platform")["Global_Sales"]
            .sum()
            .nlargest(25)
            .index
        )

        # Step 2: Filter data for these platforms
        filtered_df = vg_df_cleaned[vg_df_cleaned["Platform"].isin(top_platforms)]

        # Step 3: Group by year and platform, summing sales
        trend_data = (
            filtered_df.groupby(["Year", "Platform"])["Global_Sales"]
            .sum()
            .unstack(fill_value=0)
            .sort_index()
        )

        # Step 4: Prepare data for charting
        response = {
            "years": trend_data.index.tolist(),
            "platforms": trend_data.columns.tolist(),
            "data": [
                trend_data[platform].tolist() for platform in trend_data.columns
            ],
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/game/genre_trend")
def game_genre_trend():
    try:
        # Clean the dataset
        vg_df_cleaned = vg_df.dropna(subset=["Year", "Genre"])
        vg_df_cleaned["Year"] = vg_df_cleaned["Year"].astype(int)

        # Get top 10 genres by total count
        top_genres = vg_df_cleaned["Genre"].value_counts().nlargest(20).index

        # Filter for only top genres
        filtered_df = vg_df_cleaned[vg_df_cleaned["Genre"].isin(top_genres)]

        # Group by Year and Genre, then count occurrences
        trend_data = (
            filtered_df.groupby(["Year", "Genre"])
            .size()
            .unstack(fill_value=0)
            .sort_index()
        )

        response = {
            "years": trend_data.index.tolist(),
            "genres": trend_data.columns.tolist(),
            "data": [
                trend_data[genre].tolist() for genre in trend_data.columns
            ]
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/game/publisher_distribution")
def game_publisher_distribution():
    try:
        top_publishers = vg_df["Publisher"].value_counts().nlargest(10)
        return jsonify({"labels": top_publishers.index.tolist(), "data": top_publishers.values.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/game/year_distribution")
def game_year_distribution():
    try:
        vg_df["Year"] = pd.to_numeric(vg_df["Year"], errors='coerce')
        counts = vg_df["Year"].dropna().astype(int).value_counts().sort_index()
        return jsonify({"labels": counts.index.tolist(), "data": counts.values.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# COMBINED TRENDS
@app.route("/api/combined/rating_distribution")
def rating_distribution():
    try:
        # Drop NaN and convert ratings to float
        anime_ratings = pd.to_numeric(anime_df["Rating"], errors='coerce').dropna()
        movie_ratings = pd.to_numeric(movie_df["IMDb"], errors='coerce').dropna()

        # Define bins and labels
        bins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        bin_labels = [f"{i}-{i+1}" for i in range(1, 10)]

        # Bin the ratings
        anime_binned = pd.cut(anime_ratings, bins=bins, labels=bin_labels, include_lowest=True)
        movie_binned = pd.cut(movie_ratings, bins=bins, labels=bin_labels, include_lowest=True)

        # Count occurrences
        anime_counts = anime_binned.value_counts().sort_index()
        movie_counts = movie_binned.value_counts().sort_index()

        return jsonify({
            "labels": bin_labels,
            "anime": anime_counts.tolist(),
            "movie": movie_counts.tolist()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/combined/titles_by_year")
def combined_titles_by_year():
    try:
        # Ensure years are numeric
        movie_df["Year"] = pd.to_numeric(movie_df["Year"], errors='coerce')
        vg_df["Year"] = pd.to_numeric(vg_df["Year"], errors='coerce')

        # Count titles per year
        movie_counts = movie_df["Year"].dropna().astype(int).value_counts()
        game_counts = vg_df["Year"].dropna().astype(int).value_counts()

        # Get a sorted union of all years from both datasets
        all_years = sorted(set(movie_counts.index).union(set(game_counts.index)))

        # Build aligned counts for each year
        movie_data = [int(movie_counts.get(year, 0)) for year in all_years]
        game_data = [int(game_counts.get(year, 0)) for year in all_years]

        return jsonify({
            "labels": all_years,
            "movies": movie_data,
            "games": game_data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/combined/avg_rating_by_genre")
def combined_avg_rating_by_genre():
    try:
        # Prepare anime genre data
        anime_genres = anime_df[["Genre", "Rating"]].dropna()
        anime_genres = anime_genres.assign(Genre=anime_genres["Genre"].str.split(", "))
        anime_expanded = anime_genres.explode("Genre")
        anime_avg = anime_expanded.groupby("Genre")["Rating"].mean()

        # Prepare movie genre data
        movie_genres = movie_df[["Genre", "IMDb"]].dropna()
        movie_genres = movie_genres.assign(Genre=movie_genres["Genre"].str.split(", "))
        movie_expanded = movie_genres.explode("Genre")
        movie_avg = movie_expanded.groupby("Genre")["IMDb"].mean()

        # Get top 15 most common genres across both datasets
        genre_counts = pd.concat([anime_expanded["Genre"], movie_expanded["Genre"]]).value_counts()
        top_genres = genre_counts.head(15).index.tolist()

        anime_values = [round(anime_avg.get(g, 0), 2) for g in top_genres]
        movie_values = [round(movie_avg.get(g, 0), 2) for g in top_genres]

        return jsonify({
            "labels": top_genres,
            "anime_data": anime_values,
            "movie_data": movie_values
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/combined/genre_distribution")
def combined_genre_distribution():
    try:
        anime_genre = anime_df["Genre"].dropna().str.split(", ").explode()
        movie_genre = movie_df["Genre"].dropna().str.split(", ").explode()
        game_genre = vg_df["Genre"].dropna()

        # Combine and count all genres
        all_genres = pd.concat([anime_genre, movie_genre, game_genre])
        genre_counts = all_genres.value_counts()
        top_genres = genre_counts.nlargest(30).index.tolist()

        anime_counts = anime_genre.value_counts()
        movie_counts = movie_genre.value_counts()
        game_counts = game_genre.value_counts()

        anime_data = [int(anime_counts.get(g, 0)) for g in top_genres]
        movie_data = [int(movie_counts.get(g, 0)) for g in top_genres]
        game_data = [int(game_counts.get(g, 0)) for g in top_genres]

        return jsonify({
            "labels": top_genres,
            "anime_data": anime_data,
            "movie_data": movie_data,
            "game_data": game_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    app.run(debug=True)
