package net.mybluemix.gateway.dao;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

import javax.servlet.ServletContext;

/**
 * An object for accessing level data in Mongo DB.
 */
public class LevelDAOMongo implements LevelDAO {

	private final String dbName = "leveldata";
	private MongoClient client;

	public LevelDAOMongo(ServletContext sc) {
		client = (MongoClient) sc.getAttribute("datasource");
	}

	@Override
	public String getLevel(String username, String levelname) {
		MongoDatabase db = client.getDatabase(dbName);

		MongoCollection<Document> collection;
		try{
			collection = db.getCollection(username);
		} catch (IllegalArgumentException e) {
			System.err.printf("Mongo DB: No such user %s", username);
			e.printStackTrace();
			return null;
		}
		Document doc = collection.find().first();
		return doc.toJson();
	}

	@Override
	public void saveLevel(String username, String name, String leveldata) {

	}
}
