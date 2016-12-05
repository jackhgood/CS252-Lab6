package net.mybluemix.gateway.dao;

import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import javax.servlet.ServletContext;
import java.util.ArrayList;
import java.util.List;

/**
 * An object for accessing level data in Mongo DB.
 */
public class LevelDAOMongo implements LevelDAO {

	private final String dbName = "gateway";
	private final String collectionname = "levels";
	private MongoClient client;

	public LevelDAOMongo(ServletContext sc) {
		client = (MongoClient) sc.getAttribute("datasource");
	}

	@Override
	public String getLevel(String username, String levelname) {
		DB db = client.getDB(dbName);

		DBCollection collection;
		collection = db.getCollection(collectionname);
		DBCursor res;
		try{
			res = collection.find(new BasicDBObject("levelname", levelname));
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("Exception with loading database");
			return null;
		}

		if(res.hasNext()) {
			DBObject dbo = res.next();
			String p = (String)dbo.get("username");
			System.out.println("Username on DAO end: " + p);
			if(p.equals(username)) {
				return (String)dbo.get("leveldata");
			}
		}
		return null;

	}

	@Override
	public Boolean saveLevel(String username, String levelname, String leveldata) {
		DB db = client.getDB(dbName);

		DBCollection collection;
		collection = db.getCollection(collectionname);
		DBCursor res;
		try{
			res = collection.find(new BasicDBObject("levelname", levelname));
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("Exception with loading database");
			return false;
		}

		while(res.hasNext()) {
			DBObject dbo = res.next();
			String p = (String)dbo.get("username");
			if(p.equals(username)) {
				//Overwrites old level
				BasicDBObject bdbo = new BasicDBObject();
				bdbo.put("leveldata", leveldata);
				bdbo.put("username", username);
				bdbo.put("levelname", levelname);
				collection.findAndModify(dbo, bdbo);
				return true;
			}
		}

		BasicDBObject doc = new BasicDBObject();
		doc.put("username", username);
		doc.put("levelname", levelname);
		doc.put("leveldata", leveldata);
		collection.insert(doc);
		return true;
	}

	@Override
	public ArrayList<String> getLevels(String username) {
		DB db = client.getDB(dbName);

		DBCollection collection;
		collection = db.getCollection(collectionname);
		DBCursor res;

		try{
			res = collection.find(new BasicDBObject("username", username));
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("Exception with loading database");
			return null;
		}

		ArrayList<String> levellist = new ArrayList<>();
		while(res.hasNext()) {
			String p = (String)res.next().get("levelname");
			levellist.add(p);
		}
		return levellist;
	}
}
