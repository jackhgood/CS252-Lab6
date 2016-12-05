package net.mybluemix.gateway.dao;

import com.mongodb.*;

import javax.servlet.ServletContext;
import java.util.ArrayList;

/**
 * An object for accessing level data in Mongo DB.
 */

public class UserDAOMongo implements UserDAO {

    private final String dbName = "gateway";
    private final String collectionname = "userinfo";
    private MongoClient client;

    public UserDAOMongo(ServletContext sc) {
        client = (MongoClient) sc.getAttribute("datasource");
    }

    @Override
    public ArrayList<String> getUsers() {

        ArrayList<String> al = new ArrayList<>();

        DB db = client.getDB(dbName);

        DBCollection collection;
        collection = db.getCollection(collectionname);
        DBCursor res;
        try{
            res = collection.find();
        }
        catch (Exception e) {
            e.printStackTrace();
            System.out.println("Exception with loading database");
            return null;
        }

        while(res.hasNext()) {
            String p = (String)res.next().get("username");
            al.add(p);
        }

        return al;
    }

}
