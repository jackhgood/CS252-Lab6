package net.mybluemix.gateway.authenticator;

import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.servlet.Servlet;
import javax.servlet.ServletContext;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by Austin Lowell on 12/4/2016.
 */
@Component
public class LoginAuthProvider implements AuthenticationProvider {

    public static ServletContext sc;

    public void setServletContext(ServletContext s) {
        sc = s;
    }

    @Override
    public Authentication authenticate(Authentication auth) throws AuthenticationException {
        String name = auth.getName();
        String pass = auth.getCredentials().toString();

        //System.out.println(name + " " + pass);

        MongoClient client = (MongoClient) sc.getAttribute("datasource");
        DB db = client.getDB("gateway");

        DBCollection collection;
        collection = db.getCollection("userinfo");
        DBCursor res;
        try{
            res = collection.find(new BasicDBObject("username", name), new BasicDBObject("password", 1));
        }
        catch (Exception e) {
            e.printStackTrace();
            System.out.println("Exception with loading database");
            return null;
        }

        if(res.hasNext()) {
            String p = (String)res.next().get("password");
            //System.out.println(p);
            if(p.equals(pass)) {
                List<GrantedAuthority> gauths = new ArrayList<>();
                gauths.add(new SimpleGrantedAuthority("ROLE_USER"));
                Authentication a = new UsernamePasswordAuthenticationToken(name, pass, gauths);
                System.out.println("Good login");
                return a;
            }
        }

        System.out.println("Bad login");
        throw new BadCredentialsException("Username/Password does not match for " + auth.getPrincipal());
    }

    @Override
    public boolean supports(Class<? extends Object> authentication) {
        //System.out.println(authentication.getTypeName());
        //System.out.println(UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication));
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
