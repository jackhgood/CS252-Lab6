package net.mybluemix.gateway.controller;

import com.mongodb.*;
import net.mybluemix.gateway.authenticator.LoginAuthProvider;
import net.mybluemix.gateway.authenticator.RegistrationForm;
import net.mybluemix.gateway.dao.DAOFactory;
import net.mybluemix.gateway.dao.LevelDAO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Basic controller for the main menu page.
 */
@Controller
@RequestMapping("")
public class MainController {

    @SuppressWarnings("SpringJavaAutowiringInspection")
	@Autowired
    ServletContext servletContext;

    /**
     * Play the game.
     * @return the name of the jsp to display
     */
	@PreAuthorize("hasRole('ROLE_USER')")
	@RequestMapping("/play")
	public String play(HttpServletRequest request, Model model) {
		model.addAttribute("data", null);

		return "game";
	}

	/**
	 * Save the level.
	 */
	@RequestMapping(value = "/save", method = RequestMethod.POST)
	@ResponseBody
	public String save(HttpServletRequest request, HttpServletResponse response, @RequestParam String data, Model model) {
		model.addAttribute("message", data);
		return data;
	}


	/**
	 * Go to the home page.
	 * @return the name of the jsp to display
	 */
	@RequestMapping(value={"", "/main"})
	public String home(HttpServletRequest request, Model model) {
		LevelDAO dao = DAOFactory.getLevelDAO(servletContext);
		model.addAttribute("message", dao.getLevel("test", ""));
		//model.addAttribute("message", "Hello");
		return "main";
	}


	@PostMapping("/register")
	public String register(HttpServletRequest request, Model model, @ModelAttribute RegistrationForm registrationform) {
		String pw1 = registrationform.getPassword();
		String pw2 = registrationform.getPassword2();
		String u = registrationform.getUsername();

		if(!pw1.equals(pw2)) {
			//TODO: add error page call
			return "pwsdontmatch";
		}

		MongoClient client = (MongoClient) servletContext.getAttribute("datasource");
		DB db = client.getDB("gateway");

		DBCollection collection;
		collection = db.getCollection("userinfo");
		DBCursor res;
		try{
			res = collection.find(new BasicDBObject("username", u));
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("Exception with loading database");
			return null;
		}

		if(res.size() > 0) {
			//TODO: add error page call
			return "alreadyexists";
		}

		BasicDBObject doc = new BasicDBObject();
		doc.put("username", u);
		doc.put("password", pw1);
		collection.insert(doc);

		return "registered";
	}

	@RequestMapping("/register")
	public String badRegister(HttpServletRequest request, Model model) {
		model.addAttribute("registrationform", new RegistrationForm());

		return "registration";
	}


	@RequestMapping(value="/logout", method=RequestMethod.GET)
	public String logout(HttpServletRequest request, Model model) {
		new SecurityContextLogoutHandler().logout(request, null, null);
		return "loggedout";
	}

}